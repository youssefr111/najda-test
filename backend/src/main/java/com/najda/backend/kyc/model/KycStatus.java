package com.najda.backend.kyc.model;

import java.util.Optional;

/** Where a user is in identity verification. */
public enum KycStatus {
    NOT_STARTED,
    IN_PROGRESS,
    /** Submitted; a person at the provider is reviewing it. */
    IN_REVIEW,
    VERIFIED,
    DECLINED,
    EXPIRED,
    /** The person left without finishing. They can simply start again. */
    ABANDONED;

    /** Finished one way or the other: a late or retried "in progress" message must not undo it. */
    public boolean isSettled() {
        return this == VERIFIED || this == DECLINED || this == EXPIRED || this == ABANDONED;
    }

    /**
     * Didit's status labels are exact, case-sensitive strings (note "Kyc Expired" has a single capital K).
     * Anything unknown or irrelevant to us (e.g. "Awaiting User", a business-session state) maps to nothing and is ignored.
     */
    public static Optional<KycStatus> fromDidit(String diditStatus) {
        if (diditStatus == null) return Optional.empty();
        return switch (diditStatus) {
            case "Approved" -> Optional.of(VERIFIED);
            case "Declined" -> Optional.of(DECLINED);
            case "In Review" -> Optional.of(IN_REVIEW);
            case "Not Started", "In Progress", "Resubmitted" -> Optional.of(IN_PROGRESS);
            case "Abandoned" -> Optional.of(ABANDONED);
            case "Expired", "Kyc Expired" -> Optional.of(EXPIRED);
            default -> Optional.empty();
        };
    }
}
