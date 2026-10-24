package com.najda.backend.incident.service;

import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.CallerHistoryResponse;
import com.najda.backend.incident.dto.FlaggedCallerResponse;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.repository.IncidentRepository;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Caller history for dispatch (one incident's caller) and the admin review list.
 *
 * <p>Who is on the review list is decided by {@link CallerTrustPolicy}: a severity-weighted score that
 * fades over time, not two fixed cliffs ("3 cancellations in 30 days" / "any false report in 90").
 * The plain counts are still returned for display.
 */
@Service
public class CallerHistoryServiceImpl implements CallerHistoryService {

    /** How far back plain cancellation counts are shown. */
    private static final int CANCELLATION_WINDOW_DAYS = 30;

    /** How far back plain false-report counts are shown. */
    private static final int FALSE_REPORT_WINDOW_DAYS = 90;

    private static final long NO_EXCLUDED_INCIDENT = -1L;

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final CallerTrustService callerTrustService;

    public CallerHistoryServiceImpl(
            IncidentRepository incidentRepository, UserRepository userRepository, CallerTrustService callerTrustService) {
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.callerTrustService = callerTrustService;
    }

    @Override
    public CallerHistoryResponse getForIncident(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        return historyFor(incident.getCitizen().getId(), incident.getId());
    }

    @SuppressWarnings("null")
    @Override
    public List<FlaggedCallerResponse> getFlaggedCallers() {
        Instant since = Instant.now().minus(CallerTrustPolicy.WINDOW_DAYS, ChronoUnit.DAYS);

        // Anyone with a false-report verdict or a post-dispatch cancellation in the window is a candidate;
        // the policy then decides who is actually worth a human's attention.
        Set<Long> candidates = new LinkedHashSet<>(incidentRepository.findCitizenIdsWithFalseReportsSince(since));
        incidentRepository.findFrequentCancellersAfterDispatch(since, 1).forEach(row -> candidates.add(row.getCitizenId()));

        return candidates.stream()
                .map(this::toFlaggedCaller)
                .filter(caller -> !"NONE".equals(caller.trustTier()))
                .sorted(Comparator.comparingDouble(FlaggedCallerResponse::trustScore).reversed())
                .toList();
    }

    private FlaggedCallerResponse toFlaggedCaller(Long citizenId) {
        User citizen = userRepository.findById(citizenId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        CallerHistoryResponse history = historyFor(citizenId, NO_EXCLUDED_INCIDENT);

        return new FlaggedCallerResponse(
                citizenId,
                citizen.getFirstName() + " " + citizen.getLastName(),
                citizen.getEmail(),
                citizen.isEnabled(),
                history.cancellationWindowDays(),
                history.totalReports(),
                history.cancelledReports(),
                history.cancelledAfterDispatch(),
                history.falseReportWindowDays(),
                history.falseReports(),
                incidentRepository.findLastCancelledAt(citizenId),
                history.trustScore(),
                history.trustTier());
    }

    private CallerHistoryResponse historyFor(Long citizenId, Long excludedIncidentId) {
        Instant cancellationSince = Instant.now().minus(CANCELLATION_WINDOW_DAYS, ChronoUnit.DAYS);
        Instant falseReportSince = Instant.now().minus(FALSE_REPORT_WINDOW_DAYS, ChronoUnit.DAYS);
        CallerTrustPolicy.Assessment trust = callerTrustService.assess(citizenId);

        return new CallerHistoryResponse(
                CANCELLATION_WINDOW_DAYS,
                incidentRepository.countReportsSince(citizenId, excludedIncidentId, cancellationSince),
                incidentRepository.countCancelledSince(citizenId, excludedIncidentId, cancellationSince),
                incidentRepository.countCancelledAfterDispatchSince(citizenId, excludedIncidentId, cancellationSince),
                FALSE_REPORT_WINDOW_DAYS,
                incidentRepository.countFalseReportsSince(citizenId, excludedIncidentId, falseReportSince),
                trust.score(),
                trust.tier().name());
    }
}
