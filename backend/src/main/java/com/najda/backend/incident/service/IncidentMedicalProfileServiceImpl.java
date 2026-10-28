package com.najda.backend.incident.service;

import com.najda.backend.audit.model.AuditLog;
import com.najda.backend.audit.repository.AuditLogRepository;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.IncidentMedicalProfileResponse;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.IncidentStatus;
import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.incident.repository.HospitalTransferRepository;
import com.najda.backend.incident.repository.IncidentRepository;
import com.najda.backend.incident.repository.MissionParticipantRepository;
import com.najda.backend.unit.model.UnitType;
import com.najda.backend.user.dto.MedicalProfileResponse;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.user.service.MedicalProfileService;
import java.util.EnumSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lets the people treating a patient see their medical profile -- and nobody else.
 *
 * A viewer must (1) be attached to the incident in a medical capacity, (2) be
 * looking at an incident that is still open, and (3) the patient must have both
 * given standing consent and not opted this report out. Every successful read
 * is written to the audit log; if that write fails, the read fails with it.
 *
 * Admins are deliberately excluded: administering the platform is not treating a patient.
 */
@Service
@RequiredArgsConstructor
public class IncidentMedicalProfileServiceImpl implements IncidentMedicalProfileService {

    private static final Set<IncidentStatus> CLOSED_STATUSES =
            EnumSet.of(IncidentStatus.RESOLVED, IncidentStatus.CANCELLED);

    /** Crews that deliver medical care. Fire and police units don't need a patient's medical history. */
    private static final Set<UnitType> MEDICAL_UNIT_TYPES =
            EnumSet.of(UnitType.AMBULANCE, UnitType.FIRST_RESPONDER);

    /** A hospital can see the patient from the moment a crew is on the way until the mission closes. */
    private static final Set<MissionStatus> TRANSFER_MISSION_STATUSES =
            EnumSet.of(MissionStatus.ACCEPTED, MissionStatus.EN_ROUTE, MissionStatus.ARRIVED, MissionStatus.COMPLETED);

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final MissionParticipantRepository missionParticipantRepository;
    private final HospitalTransferRepository hospitalTransferRepository;
    private final MedicalProfileService medicalProfileService;
    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public IncidentMedicalProfileResponse getForIncident(Long viewerId, Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        User viewer = userRepository.findById(viewerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String role = viewer.getRole().getRoleName().toUpperCase();

        if (CLOSED_STATUSES.contains(incident.getStatus()) || !isAttachedToIncident(viewer, role, incident)) {
            throw new AccessDeniedException("You can't view this patient's medical profile.");
        }
        if (!incident.isShareMedicalProfile()) {
            return new IncidentMedicalProfileResponse(false, null);
        }

        Long patientId = incident.getCitizen().getId();
        MedicalProfileResponse profile = medicalProfileService.getProfile(patientId);
        if (!profile.shareWithResponders()) {
            // Consent was withdrawn after the report was filed -- it takes effect immediately.
            return new IncidentMedicalProfileResponse(false, null);
        }

        recordAccess(viewer, role, incident.getId(), patientId);
        return new IncidentMedicalProfileResponse(true, profile);
    }

    private boolean isAttachedToIncident(User viewer, String role, Incident incident) {
        return switch (role) {
            case "DISPATCHER" -> true;
            case "AMBULANCE_CREW", "FIRST_RESPONDER" -> missionParticipantRepository.existsParticipantOnIncident(
                    viewer.getId(), incident.getId(), MissionStatus.FIELD_ACTIVE, MEDICAL_UNIT_TYPES);
            case "HOSPITAL_STAFF" -> viewer.getFacility() != null
                    && hospitalTransferRepository.existsTransferToHospital(
                            incident.getId(), viewer.getFacility().getId(), TRANSFER_MISSION_STATUSES);
            default -> false;
        };
    }

    private void recordAccess(User viewer, String role, Long incidentId, Long patientId) {
        AuditLog log = new AuditLog();
        log.setActorUserId(viewer.getId());
        log.setAction("MEDICAL_PROFILE_VIEWED");
        log.setTargetUserId(patientId);
        log.setDetails("incident=" + incidentId + ", viewerRole=" + role);
        auditLogRepository.save(log);
    }
}