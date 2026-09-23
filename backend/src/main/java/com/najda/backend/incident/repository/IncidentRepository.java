package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.IncidentCategory;
import com.najda.backend.incident.model.IncidentStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findByCitizenId(Long citizenId);

    List<Incident> findByStatusInOrderByCreatedAtAsc(List<IncidentStatus> statuses);

    List<Incident> findByCitizenIdOrderByCreatedAtDesc(Long citizenId);

    List<Incident> findByCategoryAndStatusInAndCreatedAtAfter(IncidentCategory category, List<IncidentStatus> statuses, LocalDateTime after);

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
            @Param("since") LocalDateTime since);
}