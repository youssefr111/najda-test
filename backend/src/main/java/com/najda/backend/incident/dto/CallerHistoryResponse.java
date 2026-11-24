package com.najda.backend.incident.dto;

/** How a caller has behaved recently, excluding the incident being viewed. */
public record CallerHistoryResponse(
        int cancellationWindowDays,
        long totalReports,
        long cancelledReports,
        long cancelledAfterDispatch,
        int falseReportWindowDays,
        long falseReports,
        /** Decayed, severity-weighted abuse score (see CallerTrustPolicy). 0 for a clean history. */
        double trustScore,
        /** NONE, WATCH, COOLDOWN or REVIEW. */
        String trustTier
) {}
