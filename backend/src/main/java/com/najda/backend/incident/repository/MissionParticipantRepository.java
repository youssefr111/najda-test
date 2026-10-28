package com.najda.backend.incident.repository;

import com.najda.backend.incident.model.MissionParticipant;
import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.unit.model.UnitType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MissionParticipantRepository extends JpaRepository<MissionParticipant, Long> {
    List<MissionParticipant> findByMissionId(Long missionId);
    List<MissionParticipant> findByUserId(Long userId);

    /** Is this user crewing a unit of one of the given types on a mission for the incident, in one of the given states? */
    @Query("""
            select count(p) > 0 from MissionParticipant p
            where p.user.id = :userId
              and p.mission.incident.id = :incidentId
              and p.mission.status in :statuses
              and p.mission.unit.unitType in :unitTypes
            """)
    boolean existsParticipantOnIncident(
            @Param("userId") Long userId,
            @Param("incidentId") Long incidentId,
            @Param("statuses") Collection<MissionStatus> statuses,
            @Param("unitTypes") Collection<UnitType> unitTypes);
}