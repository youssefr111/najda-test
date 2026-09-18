package com.najda.backend.incident.service;

import com.najda.backend.hospital.dto.HospitalCandidateResponse;
import com.najda.backend.incident.dto.HospitalTransferResponse;
import com.najda.backend.incident.dto.VitalsUpdateRequest;
import com.najda.backend.incident.dto.VitalsUpdateResponse;

import java.util.List;

public interface HospitalTransferService {
    
    List<HospitalCandidateResponse> getRecommendedHospitals(Long actorId, Long missionId);

    List<HospitalTransferResponse> getForHospital(Long callerId, Long hospitalId);

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

    HospitalTransferResponse getForMission(Long callerId, Long missionId);
}