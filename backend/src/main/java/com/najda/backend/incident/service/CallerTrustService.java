package com.najda.backend.incident.service;

import com.najda.backend.exceptions.TooManyRequestsException;
import com.najda.backend.incident.model.CancellationCategory;
import com.najda.backend.incident.model.FalseReportType;
import com.najda.backend.incident.repository.IncidentRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;

/** Applies {@link CallerTrustPolicy} to a real caller's history. */
@Service
public class CallerTrustService {

    private final IncidentRepository incidentRepository;
    private final Clock clock;

    public CallerTrustService(IncidentRepository incidentRepository, Clock clock) {
        this.incidentRepository = incidentRepository;
        this.clock = clock;
    }

    public CallerTrustPolicy.Assessment assess(Long citizenId) {
        Instant now = clock.instant();
        Instant since = now.minus(CallerTrustPolicy.WINDOW_DAYS, ChronoUnit.DAYS);

        List<CallerTrustPolicy.FalseReport> falseReports = incidentRepository.findFalseReportEvents(citizenId, since).stream()
                .map(row -> new CallerTrustPolicy.FalseReport((FalseReportType) row[0], (Instant) row[1]))
                .toList();
        List<CallerTrustPolicy.Cancellation> cancellations = incidentRepository.findCancellationEvents(citizenId, since).stream()
                .map(row -> new CallerTrustPolicy.Cancellation(
                        (CancellationCategory) row[0], (Instant) row[1], ((Number) row[2]).longValue() > 0))
                .toList();

        return CallerTrustPolicy.assess(falseReports, cancellations, now);
    }

    /**
     * Called when a report is submitted. Throws HTTP 429 (with Retry-After) only for a caller in the
     * COOLDOWN / REVIEW tier who reported less than the minimum gap ago. Never blocks anyone else.
     */
    public void requireNotCoolingDown(Long citizenId) {
        CallerTrustPolicy.Assessment assessment = assess(citizenId);
        if (!assessment.hasCooldown()) return;

        Instant lastReport = incidentRepository.findLastReportCreatedAt(citizenId);
        if (lastReport == null) return;

        Duration remaining = Duration.between(clock.instant(), lastReport.plus(assessment.minimumGapBetweenReports()));
        if (remaining.isNegative() || remaining.isZero()) return;

        long minutes = Math.max(1, (remaining.toSeconds() + 59) / 60);
        throw new TooManyRequestsException(
                "To keep emergency lines free for real emergencies, please wait about " + minutes
                        + (minutes == 1 ? " more minute" : " more minutes") + " before sending another report. "
                        + "If someone is in immediate danger, call 122 (police), 123 (ambulance) or 180 (fire) now.",
                remaining);
    }
}
