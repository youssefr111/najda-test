package com.najda.backend.incident.dto;

import java.time.Instant;

public record FlaggedCallerResponse(
        Long userId,
        String name,
        String email,
        boolean accountEnabled,
        int cancellationWindowDays,
        long totalReports,
        long cancelledReports,
        long cancelledAfterDispatch,
        int falseReportWindowDays,
        long falseReports,
        Instant lastCancelledAt
) {}