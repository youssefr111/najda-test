package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.PatientVitalsUpdate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientVitalsUpdateRepository extends JpaRepository<PatientVitalsUpdate, Long> {
    List<PatientVitalsUpdate> findByHospitalTransferIdOrderByRecordedAtDesc(Long hospitalTransferId);
}