package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.IncidentMedia;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentMediaRepository extends JpaRepository<IncidentMedia, Long> {
    List<IncidentMedia> findByIncidentId(Long incidentId);
}