package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.IncidentMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface IncidentMediaRepository extends JpaRepository<IncidentMedia, Long> {
    List<IncidentMedia> findByIncidentId(Long incidentId);
    Optional<IncidentMedia> findByStoragePath(String storagePath);
}