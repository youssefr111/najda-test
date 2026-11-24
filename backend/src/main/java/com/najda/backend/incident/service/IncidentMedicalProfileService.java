package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.IncidentMedicalProfileResponse;

public interface IncidentMedicalProfileService {
    IncidentMedicalProfileResponse getForIncident(Long viewerId, Long incidentId);
}