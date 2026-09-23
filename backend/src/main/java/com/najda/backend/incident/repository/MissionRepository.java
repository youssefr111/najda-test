package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.Mission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MissionRepository extends JpaRepository<Mission, Long> {
    List<Mission> findByIncidentId(Long incidentId);
    List<Mission> findByUnitId(Long unitId);
}