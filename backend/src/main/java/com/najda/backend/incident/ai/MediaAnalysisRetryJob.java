package com.najda.backend.incident.ai;

import com.najda.backend.ai.media.MediaAiProperties;
import com.najda.backend.incident.ai.IncidentAiEvents.MediaRegistered;
import com.najda.backend.incident.model.TranscriptStatus;
import com.najda.backend.incident.repository.IncidentMediaRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Safety net for the in-memory event queue: a restart, a deploy, a rate limit or a provider outage must not leave
 * an attachment "in progress" forever. Free models are rate limited and sometimes down, so this job matters.
 */
@Component
public class MediaAnalysisRetryJob {

    private static final Logger log = LoggerFactory.getLogger(MediaAnalysisRetryJob.class);
    private static final Duration RETRY_AFTER = Duration.ofMinutes(1);
    /** A PROCESSING row this old (counted from upload) belongs to a worker that died. */
    private static final Duration ABANDONED_AFTER = Duration.ofMinutes(15);

    private final IncidentMediaRepository mediaRepository;
    private final MediaAiProperties props;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public MediaAnalysisRetryJob(IncidentMediaRepository mediaRepository, MediaAiProperties props,
                                 ApplicationEventPublisher events, Clock clock) {
        this.mediaRepository = mediaRepository;
        this.props = props;
        this.events = events;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT1M")
    public void run() {
        if (!props.active()) return;
        Instant now = Instant.now(clock);

        int exhausted = mediaRepository.failExhausted(
                List.of(TranscriptStatus.PENDING, TranscriptStatus.PROCESSING),
                now.minus(ABANDONED_AFTER), props.maxAttempts(), TranscriptStatus.FAILED);
        if (exhausted > 0) log.warn("{} attachment(s) marked FAILED after exhausting analysis attempts", exhausted);

        for (Long id : mediaRepository.findStaleTranscriptions(
                List.of(TranscriptStatus.PROCESSING), now.minus(ABANDONED_AFTER), props.maxAttempts())) {
            mediaRepository.releaseClaim(id, TranscriptStatus.PROCESSING, TranscriptStatus.PENDING);
        }

        for (Long id : mediaRepository.findStaleTranscriptions(
                List.of(TranscriptStatus.PENDING), now.minus(RETRY_AFTER), props.maxAttempts())) {
            events.publishEvent(new MediaRegistered(id));
        }
    }
}
