package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.HospitalTransfer;
import com.najda.backend.incident.model.MissionStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HospitalTransferRepository extends JpaRepository<HospitalTransfer, Long> {
    Optional<HospitalTransfer> findByMissionId(Long missionId);
    List<HospitalTransfer> findByHospitalId(Long hospitalId);
    List<HospitalTransfer> findByHospitalIdOrderByIdDesc(Long hospitalId);
    
    @Query("SELECT t FROM HospitalTransfer t WHERE t.mission.incident.id = :incidentId")
    List<HospitalTransfer> findByIncidentId(@Param("incidentId") Long incidentId);

    /** Is a patient currently being brought to this hospital (mission accepted, en route or on scene)? */
    @Query("""
            select count(t) > 0 from HospitalTransfer t
            where t.hospital.id = :hospitalId
              and t.mission.status in :statuses
            """)
    boolean existsActiveTransferToHospital(
            @Param("hospitalId") Long hospitalId,
            @Param("statuses") Collection<MissionStatus> statuses);

    /** Is a patient from this incident being taken to this hospital, on a mission in one of the given states? */
    @Query("""
            select count(t) > 0 from HospitalTransfer t
            where t.mission.incident.id = :incidentId
              and t.hospital.id = :hospitalId
              and t.mission.status in :statuses
            """)
    boolean existsTransferToHospital(
            @Param("incidentId") Long incidentId,
            @Param("hospitalId") Long hospitalId,
            @Param("statuses") Collection<MissionStatus> statuses);
}