package com.najda.backend.facility.repository;

import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

public interface FacilityRepository extends JpaRepository<Facility, Long> {
    List<Facility> findByFacilityType(FacilityType facilityType);

    /** One page of facilities, filtered by type and/or a name fragment (already lower-cased). */
    @Query("""
            SELECT f FROM Facility f
            WHERE (:type IS NULL OR f.facilityType = :type)
              AND (:q IS NULL OR LOWER(f.name) LIKE CONCAT('%', CAST(:q AS string), '%'))
            """)
    Page<Facility> search(@Param("type") FacilityType type, @Param("q") String q, Pageable pageable);

    /** Registered = an active staff member (one of {@code staffRoles}) or a non-archived unit is linked. */
    @Modifying
    @Query("""
            UPDATE Facility f SET f.registered = true
            WHERE f.registered = false AND (
                EXISTS (SELECT 1 FROM User u JOIN u.role r
                        WHERE u.facility.id = f.id AND u.deletedAt IS NULL AND UPPER(r.roleName) IN :staffRoles)
                OR EXISTS (SELECT 1 FROM ResponseUnit x WHERE x.facility.id = f.id AND x.archivedAt IS NULL))
            """)
    int markLinkedAsRegistered(@Param("staffRoles") Collection<String> staffRoles);

    @Modifying
    @Query("""
            UPDATE Facility f SET f.registered = false
            WHERE f.registered = true
              AND NOT EXISTS (SELECT 1 FROM User u JOIN u.role r
                              WHERE u.facility.id = f.id AND u.deletedAt IS NULL AND UPPER(r.roleName) IN :staffRoles)
              AND NOT EXISTS (SELECT 1 FROM ResponseUnit x WHERE x.facility.id = f.id AND x.archivedAt IS NULL)
            """)
    int markUnlinkedAsUnregistered(@Param("staffRoles") Collection<String> staffRoles);
}