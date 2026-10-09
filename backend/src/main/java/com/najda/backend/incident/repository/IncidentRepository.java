package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.IncidentCategory;
import com.najda.backend.incident.model.IncidentStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findByCitizenId(Long citizenId);

    List<Incident> findByStatusInOrderByCreatedAtAsc(List<IncidentStatus> statuses);

    List<Incident> findByCitizenIdOrderByCreatedAtDesc(Long citizenId);

    List<Incident> findByCategoryAndStatusInAndCreatedAtAfter(IncidentCategory category, List<IncidentStatus> statuses, Instant after);

    @Query("""
        SELECT i FROM Incident i
        WHERE i.category = :category
        AND i.status IN ('NEW','AI_PROCESSED','DISPATCHER_REVIEW')
        AND i.createdAt >= :since
        AND (6371 * acos(cos(radians(:lat)) * cos(radians(i.latitude))
             * cos(radians(i.longitude) - radians(:lng))
             + sin(radians(:lat)) * sin(radians(i.latitude)))) <= :radiusKm
        """)
    List<Incident> findPossibleDuplicates(
            @Param("category") IncidentCategory category,
            @Param("lat") double lat, @Param("lng") double lng,
            @Param("radiusKm") double radiusKm,
            @Param("since") Instant since);

        /** One row per caller who cancelled after units were dispatched -- see CallerHistoryServiceImpl. */
    interface CancellerCount {
        Long getCitizenId();
        Long getCancelledCount();
    }

    @Query("""
        SELECT COUNT(i) FROM Incident i
        WHERE i.citizen.id = :citizenId AND i.id <> :excludedId AND i.createdAt >= :since
        """)
    long countReportsSince(@Param("citizenId") Long citizenId, @Param("excludedId") Long excludedId,
                           @Param("since") Instant since);

    @Query("""
        SELECT COUNT(i) FROM Incident i
        WHERE i.citizen.id = :citizenId AND i.id <> :excludedId
        AND i.cancellationCategory IS NOT NULL AND i.cancelledAt >= :since
        """)
    long countCancelledSince(@Param("citizenId") Long citizenId, @Param("excludedId") Long excludedId,
                             @Param("since") Instant since);

    @Query("""
        SELECT COUNT(i) FROM Incident i
        WHERE i.citizen.id = :citizenId AND i.id <> :excludedId
        AND i.cancellationCategory IS NOT NULL AND i.cancelledAt >= :since
        AND EXISTS (SELECT m.id FROM Mission m WHERE m.incident = i)
        """)
    long countCancelledAfterDispatchSince(@Param("citizenId") Long citizenId, @Param("excludedId") Long excludedId,
                                          @Param("since") Instant since);

    @Query("""
        SELECT i.citizen.id AS citizenId, COUNT(i) AS cancelledCount FROM Incident i
        WHERE i.cancellationCategory IS NOT NULL AND i.cancelledAt >= :since
        AND EXISTS (SELECT m.id FROM Mission m WHERE m.incident = i)
        GROUP BY i.citizen.id
        HAVING COUNT(i) >= :threshold
        ORDER BY COUNT(i) DESC
        """)
    List<CancellerCount> findFrequentCancellersAfterDispatch(@Param("since") Instant since,
                                                             @Param("threshold") long threshold);

    @Query("SELECT MAX(i.cancelledAt) FROM Incident i WHERE i.citizen.id = :citizenId AND i.cancellationCategory IS NOT NULL")
    Instant findLastCancelledAt(@Param("citizenId") Long citizenId);

        @Query("""
        SELECT COUNT(i) FROM Incident i
        WHERE i.citizen.id = :citizenId AND i.id <> :excludedId
        AND i.falseReportType IS NOT NULL AND i.falseReportMarkedAt >= :since
        """)
    long countFalseReportsSince(@Param("citizenId") Long citizenId, @Param("excludedId") Long excludedId,
                                @Param("since") Instant since);

    @Query("""
        SELECT DISTINCT i.citizen.id FROM Incident i
        WHERE i.falseReportType IS NOT NULL AND i.falseReportMarkedAt >= :since
        """)
    List<Long> findCitizenIdsWithFalseReportsSince(@Param("since") Instant since);
}