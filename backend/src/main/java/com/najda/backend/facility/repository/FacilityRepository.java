package com.najda.backend.facility.repository;

import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FacilityRepository extends JpaRepository<Facility, Long> {
    List<Facility> findByFacilityType(FacilityType facilityType);
}