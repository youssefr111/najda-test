package com.najda.backend.incident.ai;

import com.najda.backend.incident.ai.IncidentEvidence.Item;
import com.najda.backend.incident.ai.IncidentEvidence.Kind;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.IncidentMedia;
import com.najda.backend.incident.model.TranscriptStatus;
import com.najda.backend.incident.repository.IncidentMediaRepository;
import com.najda.backend.incident.repository.IncidentRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Builds {@link IncidentEvidence} from what is stored for an incident right now. */
@Component
public class IncidentEvidenceAssembler {

    /** Keeps one pathological recording from blowing up the prompt (and the bill). */
    private static final int MAX_ITEM_CHARS = 3_000;

    private final IncidentRepository incidentRepository;
    private final IncidentMediaRepository mediaRepository;

    public IncidentEvidenceAssembler(IncidentRepository incidentRepository, IncidentMediaRepository mediaRepository) {
        this.incidentRepository = incidentRepository;
        this.mediaRepository = mediaRepository;
    }

    public Optional<IncidentEvidence> assemble(Long incidentId) {
        return incidentRepository.findById(incidentId).map(incident -> assemble(incident));
    }

    @SuppressWarnings("null")
    public IncidentEvidence assemble(Incident incident) {
        List<Item> items = new ArrayList<>();
        mediaRepository.findByIncidentId(incident.getId()).stream()
                .sorted(Comparator.comparing(IncidentMedia::getId))
                .forEach(m -> toItem(m).ifPresent(items::add));

        return new IncidentEvidence(
                incident.getId(), incident.getCategory(),
                incident.getInjuredCount() == null ? 0 : incident.getInjuredCount(),
                incident.getReportedFor(), incident.getLatitude(), incident.getLongitude(),
                incident.getCreatedAt(), List.copyOf(items));
    }

    private Optional<Item> toItem(IncidentMedia m) {
        return switch (m.getMediaType()) {
            case TEXT -> Optional.ofNullable(clean(m.getTextContent()))
                    .map(text -> new Item(Kind.REPORTER_MESSAGE, text, true));
            case AUDIO -> transcriptItem(m, Kind.VOICE_NOTE);
            case VIDEO -> transcriptItem(m, Kind.VIDEO_AUDIO);
            case PHOTO -> transcriptItem(m, Kind.PHOTO);
        };
    }

    private Optional<Item> transcriptItem(IncidentMedia m, Kind kind) {
        TranscriptStatus status = m.getTranscriptStatus();
        if (status == null) return Optional.empty();   // media analysis is switched off for this row
        return Optional.of(switch (status) {
            case DONE -> {
                String text = clean(m.getTranscript());
                yield text == null
                        ? new Item(kind, "[nothing relevant could be extracted from this attachment]", false)
                        : new Item(kind, text, true);
            }
            case PENDING, PROCESSING -> new Item(kind, "[analysis in progress]", false);
            case FAILED -> new Item(kind, "[attachment present but could not be analysed]", false);
        });
    }

    private static String clean(String raw) {
        if (raw == null) return null;
        String text = raw.strip();
        if (text.isEmpty()) return null;
        return text.length() <= MAX_ITEM_CHARS ? text : text.substring(0, MAX_ITEM_CHARS) + " …[truncated]";
    }
}
