package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.MissionResponse;
import java.util.List;

public interface MissionService {

    /** Dispatcher-only. Creates a Mission for any unit type -- AMBULANCE,
        FIRE_TRUCK, POLICE_CAR, or FIRST_RESPONDER. Fails if the unit isn't
        AVAILABLE or has no active LEAD -- see ShiftService. */
    MissionResponse assignUnitMission(Long dispatcherId, Long incidentId, Long unitId);

    /** Same visibility rule as Incident.getById: dispatcher/admin always;
    otherwise only the citizen who filed it or an active mission participant. */
    List<MissionResponse> getMissionsForIncident(Long callerId, Long incidentId);

    List<MissionResponse> getMyMissions(Long userId);

    MissionResponse acceptMission(Long actorId, Long missionId);

    MissionResponse rejectMission(Long actorId, Long missionId, String reason);

    /** Only the LEAD of a mission can withdraw it. */
    MissionResponse withdrawMission(Long actorId, Long missionId);

    MissionResponse cancelMission(Long callerId, Long missionId);

    MissionResponse markEnRoute(Long actorId, Long missionId);

    MissionResponse markArrived(Long actorId, Long missionId);

    /** For POLICE_CAR/FIRE_TRUCK/FIRST_RESPONDER -- arriving IS completion.
        AMBULANCE missions do NOT complete here; see HospitalTransferService. */
    MissionResponse completeMission(Long actorId, Long missionId);
}