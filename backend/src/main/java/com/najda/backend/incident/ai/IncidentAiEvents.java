package com.najda.backend.incident.ai;

/**
 * Events that drive the AI pipeline. They are published from inside business transactions and handled only
 * AFTER the commit (see {@link IncidentAiPipeline}), so a listener never reads a half-written incident.
 */
public final class IncidentAiEvents {

    private IncidentAiEvents() {}

    /** An AUDIO / VIDEO attachment was registered and is waiting to be transcribed. */
    public record MediaRegistered(Long mediaId) {}

    /** The text the AI reasons over changed (new submission, edited message, finished transcript): re-analyse. */
    public record EvidenceChanged(Long incidentId) {}
}
