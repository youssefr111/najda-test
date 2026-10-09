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

@Service
public class CallerHistoryServiceImpl implements CallerHistoryService {

    /** How far back cancellation behaviour is counted. */
    private static final int CANCELLATION_WINDOW_DAYS = 30;

    /** Cancellations after dispatch, within that window, that put a caller on the admin review list. */
    private static final int CANCELLATION_FLAG_THRESHOLD = 3;

    /** How far back false-report marks count. Any one inside this window puts a caller on the review list. */
    private static final int FALSE_REPORT_WINDOW_DAYS = 90;

    private static final long NO_EXCLUDED_INCIDENT = -1L;

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;

    public CallerHistoryServiceImpl(IncidentRepository incidentRepository, UserRepository userRepository) {
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
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
        Set<Long> citizenIds = new LinkedHashSet<>();
        incidentRepository.findFrequentCancellersAfterDispatch(
                        Instant.now().minus(CANCELLATION_WINDOW_DAYS, ChronoUnit.DAYS), CANCELLATION_FLAG_THRESHOLD)
                .forEach(row -> citizenIds.add(row.getCitizenId()));
        citizenIds.addAll(incidentRepository.findCitizenIdsWithFalseReportsSince(
                Instant.now().minus(FALSE_REPORT_WINDOW_DAYS, ChronoUnit.DAYS)));

        return citizenIds.stream()
                .map(this::toFlaggedCaller)
                .sorted(Comparator.comparingLong(FlaggedCallerResponse::falseReports)
                        .thenComparingLong(FlaggedCallerResponse::cancelledAfterDispatch)
                        .reversed())
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
                incidentRepository.findLastCancelledAt(citizenId));
    }

    private CallerHistoryResponse historyFor(Long citizenId, Long excludedIncidentId) {
        Instant cancellationSince = Instant.now().minus(CANCELLATION_WINDOW_DAYS, ChronoUnit.DAYS);
        Instant falseReportSince = Instant.now().minus(FALSE_REPORT_WINDOW_DAYS, ChronoUnit.DAYS);

        return new CallerHistoryResponse(
                CANCELLATION_WINDOW_DAYS,
                incidentRepository.countReportsSince(citizenId, excludedIncidentId, cancellationSince),
                incidentRepository.countCancelledSince(citizenId, excludedIncidentId, cancellationSince),
                incidentRepository.countCancelledAfterDispatchSince(citizenId, excludedIncidentId, cancellationSince),
                FALSE_REPORT_WINDOW_DAYS,
                incidentRepository.countFalseReportsSince(citizenId, excludedIncidentId, falseReportSince));
    }
}