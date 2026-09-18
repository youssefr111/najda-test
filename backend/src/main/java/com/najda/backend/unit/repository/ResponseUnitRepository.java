package com.najda.backend.unit.repository;

import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.model.UnitType;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResponseUnitRepository extends JpaRepository<ResponseUnit, Long> {

    List<ResponseUnit> findByUnitTypeAndStatus(UnitType unitType, UnitStatus status);

    List<ResponseUnit> findByUnitType(UnitType unitType);

    List<ResponseUnit> findByStatus(UnitStatus status);

    List<ResponseUnit> findByUnitTypeAndFacilityId(UnitType unitType, Long facilityId);

    Optional<ResponseUnit> findByAssignedEmployeeId(Long employeeId);

    /** Locks the row for the rest of the enclosing transaction -- see
        MissionServiceImpl.assignUnitMission for the concurrency reasoning. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM ResponseUnit u WHERE u.id = :id")
    Optional<ResponseUnit> findByIdForUpdate(@Param("id") Long id);

    /** Candidate list for the dispatcher's "Assign Units" panel -- available,
        correct type, within radius, nearest first. */
    @Query("""
        SELECT u FROM ResponseUnit u
        WHERE u.unitType = :unitType
        AND u.status = 'AVAILABLE'
        AND u.latitude IS NOT NULL
        AND (6371 * acos(cos(radians(:lat)) * cos(radians(u.latitude))
             * cos(radians(u.longitude) - radians(:lng))
             + sin(radians(:lat)) * sin(radians(u.latitude)))) <= :radiusKm
        ORDER BY (6371 * acos(cos(radians(:lat)) * cos(radians(u.latitude))
             * cos(radians(u.longitude) - radians(:lng))
             + sin(radians(:lat)) * sin(radians(u.latitude))))
        """)
    List<ResponseUnit> findAvailableCandidates(
            @Param("unitType") UnitType unitType,
            @Param("lat") double lat, @Param("lng") double lng,
            @Param("radiusKm") double radiusKm);
}