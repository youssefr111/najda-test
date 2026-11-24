package com.najda.backend.incident.ai;

import com.najda.backend.incident.model.IncidentCategory;
import com.najda.backend.incident.model.ReportedFor;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Everything the AI is allowed to know about one incident, in one place: the reporter's written message plus the
 * machine transcript of every voice note and video, and a machine description of every photo. Priority scoring and duplicate detection both read this
 * instead of each fetching "the TEXT row" on their own, so a new evidence type is added in exactly one class.
 */
public record IncidentEvidence(
        Long incidentId,
        IncidentCategory category,
        int injuredCount,
        ReportedFor reportedFor,
        double latitude,
        double longitude,
        Instant createdAt,
        List<Item> items) {

    public enum Kind {
        REPORTER_MESSAGE("REPORTER WRITTEN MESSAGE"),
        VOICE_NOTE("VOICE NOTE (machine transcript, may contain recognition errors)"),
        VIDEO_AUDIO("VIDEO AUDIO TRACK (machine transcript, may contain recognition errors)"),
        PHOTO("PHOTO (machine-generated description by an image model, may be incomplete or wrong)");

        final String label;

        Kind(String label) {
            this.label = label;
        }
    }

    /**
     * @param settled true when {@code text} is real content. Placeholders such as "[transcription in progress]"
     *                are shown to the model so it knows evidence exists, but are not content.
     */
    public record Item(Kind kind, String text, boolean settled) {}

    /** True when there is at least one piece of real content (not just a category and a pin on a map). */
    @SuppressWarnings("null")
    public boolean hasContent() {
        return items.stream().anyMatch(Item::settled);
    }

    /** The evidence as it is shown to the model: one labelled block per source. */
    public String narrative() {
        if (items.isEmpty()) return "(no message provided)";
        return items.stream()
                .map(i -> "[" + i.kind().label + "]\n" + i.text())
                .collect(Collectors.joining("\n\n"));
    }

    /**
     * Identifies the CONTENT the analysis was based on. Placeholders are excluded on purpose: a recording that
     * merely started transcribing must not invalidate a run that is already in flight, only real new content
     * (an edited message, a finished transcript) should.
     */
    public String fingerprint() {
        @SuppressWarnings("null")
        String settled = items.stream()
                .filter(Item::settled)
                .map(i -> i.kind() + ":" + i.text())
                .collect(Collectors.joining("\u0000"));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(settled.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);   // SHA-256 is mandatory in every JVM
        }
    }
}
