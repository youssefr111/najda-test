package com.najda.backend.incident.service;

import com.najda.backend.hospital.dto.HospitalCandidateResponse;
import com.najda.backend.incident.dto.HospitalTransferResponse;
import com.najda.backend.incident.dto.IncidentTransferVitalsResponse;
import com.najda.backend.incident.dto.VitalsUpdateRequest;
import com.najda.backend.incident.dto.VitalsUpdateResponse;

import java.util.List;

public interface HospitalTransferService {
    
    List<HospitalCandidateResponse> getRecommendedHospitals(Long actorId, Long missionId);

    List<HospitalTransferResponse> getForHospital(Long callerId, Long hospitalId);
    
    List<HospitalTransferResponse> getForIncident(Long callerId, Long incidentId);

    /** LEAD-only. Exactly one of hospitalId / destinationNameFreetext must
        be provided -- the latter for a hospital outside the system. */
    HospitalTransferResponse selectHospital(Long actorId, Long missionId, Long hospitalId, String destinationNameFreetext);

    HospitalTransferResponse markEnRoute(Long actorId, Long hospitalTransferId);

    /** Marking arrival here is what actually completes the Mission --
        AMBULANCE missions are deliberately blocked from completing via
        MissionService.completeMission (see that class's guard). */
    HospitalTransferResponse markArrived(Long actorId, Long hospitalTransferId);

    /** Rejected outright if the selected hospital isn't `registered` --
        there's no dashboard on the other end to receive this data. */
    List<VitalsUpdateResponse> getVitalsHistory(Long actorId, Long hospitalTransferId);

    void sendVitalsUpdate(Long actorId, VitalsUpdateRequest request);

    /**
     * Every patient transfer on the incident that the caller may see vitals for, with its readings. Dispatch and
     * admin see all of them, the ambulance crew their own mission's, a hospital's staff the transfers heading
     * there. Anyone else gets an empty list rather than an error, so any incident screen can ask.
     */
    List<IncidentTransferVitalsResponse> getVitalsForIncident(Long callerId, Long incidentId);

    HospitalTransferResponse getForMission(Long callerId, Long missionId);
}