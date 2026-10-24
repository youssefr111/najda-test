package com.najda.backend.incident.controller;

import com.najda.backend.incident.dto.IncidentMedicalProfileResponse;
import com.najda.backend.incident.service.IncidentMedicalProfileService;
import com.najda.backend.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only access to the patient's medical profile for the people treating them.
 * The role check here is only a coarse first gate; the real rules (attached to this
 * incident, incident still open, patient consent) live in the service.
 */
@RestController
@RequestMapping("/api/incidents/{incidentId}/medical-profile")
@RequiredArgsConstructor
public class IncidentMedicalProfileController {

    private final IncidentMedicalProfileService incidentMedicalProfileService;

    @PreAuthorize("hasAnyRole('DISPATCHER','AMBULANCE_CREW','FIRST_RESPONDER','HOSPITAL_STAFF')")
    @GetMapping
    public IncidentMedicalProfileResponse getPatientMedicalProfile(
            @AuthenticationPrincipal User viewer,
            @PathVariable Long incidentId) {
        return incidentMedicalProfileService.getForIncident(viewer.getId(), incidentId);
    }
}