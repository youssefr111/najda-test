package com.najda.backend.facility.repository;

import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FacilityRepository extends JpaRepository<Facility, Long> {
    List<Facility> findByFacilityType(FacilityType facilityType);

    /** One page of facilities, filtered by type and/or a name fragment (already lower-cased). */
    @Query("""
            SELECT f FROM Facility f
            WHERE (:type IS NULL OR f.facilityType = :type)
              AND (:q IS NULL OR LOWER(f.name) LIKE CONCAT('%', CAST(:q AS string), '%'))
            """)
    Page<Facility> search(@Param("type") FacilityType type, @Param("q") String q, Pageable pageable);
}