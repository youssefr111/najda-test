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
     /**
     * Is this user on the crew of a unit that was offered this incident and has not turned it down? True while the
     * offer is open (they have to see the incident to decide) and for good once the mission was accepted (so
     * they can still look back at it). A rejected offer, or one withdrawn before it was accepted, gives no access.
     */
    default boolean hasAccessToIncident(Long userId, Long incidentId) {
        return existsOfferedOrAccepted(userId, incidentId, MissionStatus.OFFERED);
    }

    @Query("""
            select count(p) > 0 from MissionParticipant p
            where p.user.id = :userId
              and p.mission.incident.id = :incidentId
              and (p.mission.status = :offered or p.mission.acceptedAt is not null)
            """)
    boolean existsOfferedOrAccepted(
            @Param("userId") Long userId,
            @Param("incidentId") Long incidentId,
            @Param("offered") MissionStatus offered);

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