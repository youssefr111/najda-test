package com.najda.backend.incident.ai;

import com.najda.backend.ai.llm.OpenRouterException;
import com.najda.backend.ai.media.MediaAiClient;
import com.najda.backend.ai.media.MediaAiProperties;
import com.najda.backend.ai.media.MediaConverter;
import com.najda.backend.incident.ai.IncidentAiEvents.EvidenceChanged;
import com.najda.backend.incident.model.IncidentMedia;
import com.najda.backend.incident.model.MediaType;
import com.najda.backend.incident.model.TranscriptStatus;
import com.najda.backend.incident.repository.IncidentMediaRepository;
import com.najda.backend.incident.service.IncidentEventPublisher;
import com.najda.backend.incident.service.SupabaseStorageService;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;

/**
 * Turns one attachment into text the AI can reason over:
 *   AUDIO / VIDEO -> transcript of the speech (omni model)
 *   PHOTO         -> short factual description (vision model)
 * The text lands in IncidentMedia.transcript. Runs on the media executor, never on a request thread.
 *
 * The database connection is held only for the short claim / load / save steps; the slow parts (download,
 * ffmpeg, model call) run with no transaction open.
 */
@Service
public class MediaUnderstandingService {

    private static final Logger log = LoggerFactory.getLogger(MediaUnderstandingService.class);

    /** Only the two containers the models accept; others fail with a clear "ffmpeg is required". */
    private static final Set<String> DIRECT_AUDIO = Set.of("mp3", "wav");

    /**
     * What the analysis produced. {@code text} is the transcript (AUDIO / VIDEO, in the language spoken) or the
     * English description (PHOTO); {@code language} is the detected language of a transcript; {@code textAr} is the
     * Arabic version of a photo description.
     */
    private record Analysis(String text, String language, String textAr) {}

    /** Image containers sent as they are when ffmpeg is not available. */
    private static final Map<String, String> DIRECT_IMAGE = Map.of(
            "jpg", "image/jpeg", "jpeg", "image/jpeg", "png", "image/png", "webp", "image/webp", "gif", "image/gif");

    private record Job(Long incidentId, String storagePath, MediaType mediaType, int attempts) {}

    /** No point retrying: the file or request itself is the problem. */
    private static final class PermanentFailure extends RuntimeException {
        PermanentFailure(String message) {
            super(message);
        }
    }

    private final MediaAiProperties props;
    private final IncidentMediaRepository mediaRepository;
    private final SupabaseStorageService storage;
    private final MediaAiClient ai;
    private final MediaConverter converter;
    private final TransactionTemplate tx;
    private final ApplicationEventPublisher events;
    private final RestClient downloader;
    private final IncidentEventPublisher incidentEventPublisher;

    public MediaUnderstandingService(MediaAiProperties props,
                                     IncidentMediaRepository mediaRepository,
                                     SupabaseStorageService storage,
                                     MediaAiClient ai,
                                     MediaConverter converter,
                                     TransactionTemplate tx,
                                     ApplicationEventPublisher events,
                                     IncidentEventPublisher incidentEventPublisher) {
        this.props = props;
        this.mediaRepository = mediaRepository;
        this.storage = storage;
        this.ai = ai;
        this.converter = converter;
        this.tx = tx;
        this.events = events;
        var factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(60));
        this.downloader = RestClient.builder().requestFactory(factory).build();
        this.incidentEventPublisher = incidentEventPublisher;
    }

    /** False while switched off; attachments are then stored but never analysed. */
    public boolean isEnabled() {
        return props.active();
    }

    public void process(Long mediaId) {
        if (!props.active()) return;

        // Atomic PENDING -> PROCESSING. Exactly one caller wins; everyone else (a duplicate event, the retry job)
        // gets 0 and returns, so an attachment is never analysed twice.
        if (mediaRepository.claimForTranscription(mediaId, TranscriptStatus.PENDING, TranscriptStatus.PROCESSING) == 0) {
            return;
        }

        Job job = tx.execute(status -> mediaRepository.findById(mediaId)
                .map(m -> new Job(m.getIncident().getId(), m.getStoragePath(), m.getMediaType(), m.getTranscriptAttempts()))
                .orElse(null));
        if (job == null) return;   // the attachment was deleted while queued

        try {
            Analysis analysis = run(job);
            String text = analysis.text();
            save(mediaId, TranscriptStatus.DONE, analysis);
            log.info("Analysed {} media {} of incident {} ({} chars, language {})", job.mediaType(), mediaId,
                    job.incidentId(), text.length(), analysis.language());
            if (!text.isBlank()) {
                events.publishEvent(new EvidenceChanged(job.incidentId()));   // re-score with the new evidence
            }
        } catch (PermanentFailure e) {
            log.warn("Analysis of media {} failed permanently: {}", mediaId, e.getMessage());
            save(mediaId, TranscriptStatus.FAILED, null);
        } catch (Exception e) {
            boolean exhausted = job.attempts() >= props.maxAttempts();
            log.warn("Analysis of media {} failed (attempt {}/{}){}: {}", mediaId, job.attempts(),
                    props.maxAttempts(), exhausted ? ", giving up" : ", will retry", e.getMessage());
            // Back to PENDING: the retry job re-publishes it. FAILED only once attempts run out.
            save(mediaId, exhausted ? TranscriptStatus.FAILED : TranscriptStatus.PENDING, null);
        }
    }

    private Analysis run(Job job) throws Exception {
        if (job.storagePath() == null || job.storagePath().isBlank()) {
            throw new PermanentFailure("attachment has no storage path");
        }
        String extension = extensionOf(job.storagePath());
        byte[] original = download(job.storagePath());
        long limit = props.maxPayload().toBytes();

        try {
            return switch (job.mediaType()) {
                case AUDIO, VIDEO -> transcribe(job.mediaType(), original, extension, limit);
                case PHOTO -> describe(original, extension, limit);
                case TEXT -> throw new PermanentFailure("a text message needs no analysis");
            };
        } catch (OpenRouterException e) {
            if (e.isRetryable()) throw e;                       // rate limit / provider hiccup: try again later
            throw new PermanentFailure("model rejected the request: HTTP " + e.status());
        }
    }

    private Analysis transcribe(MediaType type, byte[] original, String extension, long limit) throws Exception {
        byte[] payload;
        String format;
        // ffmpeg first, for audio too: it shrinks the file and normalises odd phone formats. Video needs it to
        // get at the audio track at all.
        Optional<byte[]> mp3 = converter.toSpeechMp3(original, extension);
        if (mp3.isPresent()) {
            payload = mp3.get();
            format = "mp3";
        } else if (type == MediaType.AUDIO && DIRECT_AUDIO.contains(extension)) {
            payload = original;
            format = extension;
        } else {
            throw new PermanentFailure("ffmpeg is required to read the audio of a ." + extension + " file");
        }
        if (payload.length > limit) {
            throw new PermanentFailure("audio is " + payload.length + " bytes, over the " + limit + " byte limit");
        }
        MediaAiClient.Transcription heard = ai.transcribe(payload, format);
        return new Analysis(heard.text(), heard.language(), null);
    }

    private Analysis describe(byte[] original, String extension, long limit) throws Exception {
        byte[] payload;
        String mime;
        Optional<byte[]> jpeg = converter.toSmallJpeg(original, extension);
        if (jpeg.isPresent()) {
            payload = jpeg.get();
            mime = "image/jpeg";
        } else if (DIRECT_IMAGE.containsKey(extension)) {
            payload = original;
            mime = DIRECT_IMAGE.get(extension);
        } else {
            throw new PermanentFailure("ffmpeg is required to read a ." + extension + " image");
        }
        if (payload.length > limit) {
            throw new PermanentFailure("image is " + payload.length + " bytes, over the " + limit + " byte limit");
        }
        MediaAiClient.PhotoDescription seen = ai.describePhoto(payload, mime);
        return new Analysis(seen.english(), null, seen.arabic());
    }

    private byte[] download(String path) throws Exception {
        String signedUrl = storage.createSignedDownloadUrl(path, 300);
        byte[] bytes = downloader.get().uri(URI.create(signedUrl)).retrieve().body(byte[].class);
        if (bytes == null || bytes.length == 0) {
            throw new PermanentFailure("stored file is empty");
        }
        return bytes;
    }

    private void save(Long mediaId, TranscriptStatus status, Analysis analysis) {
        tx.executeWithoutResult(s -> mediaRepository.findById(mediaId).ifPresent((IncidentMedia m) -> {
            m.setTranscriptStatus(status);
            if (status == TranscriptStatus.DONE) {
                m.setTranscript(analysis.text());
                m.setTranscriptLanguage(analysis.language());
                // The Arabic version only means something next to a description it translates.
                m.setTranscriptAr(analysis.text().isBlank() || analysis.textAr() == null || analysis.textAr().isBlank()
                        ? null : analysis.textAr());
                m.setTranscribedAt(Instant.now());
            }
            mediaRepository.save(m);
        }));
        incidentEventPublisher.notifyIncidentsChanged();   // the transcript is committed: let open screens refetch now
    }

    private static String extensionOf(String path) {
        int dot = path.lastIndexOf('.');
        return dot < 0 ? "bin" : path.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
