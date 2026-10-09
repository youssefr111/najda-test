package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.HospitalTransfer;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HospitalTransferRepository extends JpaRepository<HospitalTransfer, Long> {
    Optional<HospitalTransfer> findByMissionId(Long missionId);
    List<HospitalTransfer> findByHospitalId(Long hospitalId);
    List<HospitalTransfer> findByHospitalIdOrderByIdDesc(Long hospitalId);
}