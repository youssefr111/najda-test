package com.najda.backend.incident.model;

/** Lifecycle of the speech-to-text pass over an AUDIO / VIDEO attachment. Null on TEXT and PHOTO rows. */
public enum TranscriptStatus {
    /** Waiting for a worker (or for a retry after a transient failure). */
    PENDING,
    /** Claimed by a worker; the provider call is in flight. */
    PROCESSING,
    /** Finished. The transcript may be empty when the recording contained no speech. */
    DONE,
    /** Gave up (unsupported format, too large, or retries exhausted). The incident is unaffected. */
    FAILED
}
