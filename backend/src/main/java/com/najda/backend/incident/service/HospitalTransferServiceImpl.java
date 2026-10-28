package com.najda.backend.incident.service;

import com.najda.backend.unit.service.UnitEventPublisher;
import com.najda.backend.notification.service.NotificationPublisher;
import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.hospital.dto.HospitalCandidateResponse;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.repository.FacilityRepository;
import com.najda.backend.facility.service.FacilityService;
import com.najda.backend.incident.dto.HospitalTransferResponse;
import com.najda.backend.incident.dto.IncidentTransferVitalsResponse;
import com.najda.backend.incident.dto.VitalsUpdateRequest;
import com.najda.backend.incident.dto.VitalsUpdateResponse;
import com.najda.backend.incident.model.*;
import com.najda.backend.incident.repository.*;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.user.model.User;
import com.najda.backend.unit.model.*;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.unit.repository.ShiftAssignmentRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HospitalTransferServiceImpl implements HospitalTransferService {

    private static final double SEARCH_RADIUS_KM = 30.0;

    private final MissionRepository missionRepository;
    private final IncidentRepository incidentRepository;
    private final FacilityRepository facilityRepository;
    private final FacilityService facilityService;
    private final HospitalTransferRepository hospitalTransferRepository;
    private final PatientVitalsUpdateRepository patientVitalsUpdateRepository;
    private final ResponseUnitRepository responseUnitRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final UserRepository userRepository;
    private final MissionParticipantRepository missionParticipantRepository;
    private final VitalsEventPublisher vitalsEventPublisher;
    private final MissionEventPublisher missionEventPublisher;
    private final UnitEventPublisher unitEventPublisher;
    private final IncidentEventPublisher incidentEventPublisher;

    private final NotificationPublisher notificationPublisher;

    public HospitalTransferServiceImpl(
            MissionRepository missionRepository,
            IncidentRepository incidentRepository,
            FacilityRepository facilityRepository,
            FacilityService facilityService,
            HospitalTransferRepository hospitalTransferRepository,
            PatientVitalsUpdateRepository patientVitalsUpdateRepository,
            ResponseUnitRepository responseUnitRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            UserRepository userRepository,
            MissionParticipantRepository missionParticipantRepository,
            VitalsEventPublisher vitalsEventPublisher,
            MissionEventPublisher missionEventPublisher,
            UnitEventPublisher unitEventPublisher,
            IncidentEventPublisher incidentEventPublisher,
            NotificationPublisher notificationPublisher) {
        this.missionRepository = missionRepository;
        this.incidentRepository = incidentRepository;
        this.facilityRepository = facilityRepository;
        this.facilityService = facilityService;
        this.hospitalTransferRepository = hospitalTransferRepository;
        this.patientVitalsUpdateRepository = patientVitalsUpdateRepository;
        this.responseUnitRepository = responseUnitRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.userRepository = userRepository;
        this.missionParticipantRepository = missionParticipantRepository;
        this.vitalsEventPublisher = vitalsEventPublisher;
        this.missionEventPublisher = missionEventPublisher;
        this.unitEventPublisher = unitEventPublisher;
        this.incidentEventPublisher = incidentEventPublisher;
        this.notificationPublisher = notificationPublisher;
    }

    @SuppressWarnings({ "N", "null" })
    @Override
    public List<HospitalCandidateResponse> getRecommendedHospitals(Long actorId, Long missionId) {
        Mission mission = requireMission(missionId);
        requireAmbulanceMission(mission);
        requireIsLead(actorId, mission);
        requireMissionStatus(mission, MissionStatus.ARRIVED);

        // Incident location, not the unit's live GPS -- always present, never
        // stale, and by ARRIVED the unit is physically there anyway.
        Incident incident = mission.getIncident();
        double refLat = incident.getLatitude();
        double refLon = incident.getLongitude();

        List<HospitalCandidateResponse> scored = facilityRepository.findByFacilityType(FacilityType.HOSPITAL).stream()
                .map(h -> new HospitalCandidateResponse(
                        h.getId(), h.getName(),
                        Math.round(haversineKm(refLat, refLon, h.getLatitude(), h.getLongitude()) * 10) / 10.0,
                        false))
                .filter(h -> h.distanceKm() <= SEARCH_RADIUS_KM)
                .sorted(Comparator.comparingDouble(HospitalCandidateResponse::distanceKm))
                .toList();

        if (scored.isEmpty()) {
            return scored;
        }

        return scored.stream()
                .map(h -> h.distanceKm() == scored.get(0).distanceKm()
                        ? new HospitalCandidateResponse(h.id(), h.name(), h.distanceKm(), true)
                        : h)
                .toList();
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    @Override
    public List<HospitalTransferResponse> getForHospital(Long callerId, Long hospitalId) {
        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isAdmin = caller.getRole() != null
                && List.of("ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        boolean isThisHospitalsStaff = caller.getFacility() != null && caller.getFacility().getId().equals(hospitalId);

        if (!isAdmin && !isThisHospitalsStaff) {
            throw new IllegalArgumentException("You do not have access to this hospital's transfers");
        }

        return hospitalTransferRepository.findByHospitalIdOrderByIdDesc(hospitalId).stream()
                .map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<HospitalTransferResponse> getForIncident(Long callerId, Long incidentId) {
        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean dispatchRole = caller.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        if (!dispatchRole) {
            throw new IllegalArgumentException("Only dispatch and admin can see an incident's hospital transfers");
        }
        return hospitalTransferRepository.findByIncidentId(incidentId).stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public HospitalTransferResponse selectHospital(Long actorId, Long missionId, Long hospitalId, String destinationNameFreetext) {
        Mission mission = requireMission(missionId);
        requireAmbulanceMission(mission);
        requireIsLead(actorId, mission);
        requireMissionStatus(mission, MissionStatus.ARRIVED);

        boolean hasHospitalId = hospitalId != null;
        boolean hasFreetext = destinationNameFreetext != null && !destinationNameFreetext.isBlank();

        if (hasHospitalId == hasFreetext) {
            throw new IllegalArgumentException(
                    "Provide exactly one of hospitalId or destinationNameFreetext, not both or neither");
        }

        if (hospitalTransferRepository.findByMissionId(missionId).isPresent()) {
            throw new ConflictException("A hospital has already been selected for this mission");
        }

        HospitalTransfer transfer = new HospitalTransfer();
        transfer.setMission(mission);
        transfer.setStatus(HospitalTransferStatus.SELECTED);

        if (hasHospitalId) {
            facilityService.requireFacilityOfType(hospitalId, FacilityType.HOSPITAL);
            Facility hospital = facilityRepository.findById(hospitalId)
                    .orElseThrow(() -> new ResourceNotFoundException("Hospital not found"));
            transfer.setHospital(hospital);
        } else {
            transfer.setDestinationNameFreetext(destinationNameFreetext);
        }

        HospitalTransfer saved = hospitalTransferRepository.save(transfer);
        notificationPublisher.patientIncoming(saved);
        vitalsEventPublisher.notifyTransfersChanged();
        return toResponse(saved);
    }

    @Override
    @Transactional
    public HospitalTransferResponse markEnRoute(Long actorId, Long hospitalTransferId) {
        HospitalTransfer transfer = requireTransfer(hospitalTransferId);
        requireIsLead(actorId, transfer.getMission());

        if (transfer.getStatus() != HospitalTransferStatus.SELECTED) {
            throw new ConflictException("Expected status SELECTED but it is " + transfer.getStatus());
        }

        transfer.setStatus(HospitalTransferStatus.EN_ROUTE);
        HospitalTransferResponse enRoute = toResponse(hospitalTransferRepository.save(transfer));
        vitalsEventPublisher.notifyTransfersChanged();
        return enRoute;
    }

    @Override
    @Transactional
    public HospitalTransferResponse markArrived(Long actorId, Long hospitalTransferId) {
        HospitalTransfer transfer = requireTransfer(hospitalTransferId);
        Mission mission = transfer.getMission();
        requireIsLead(actorId, mission);

        if (transfer.getStatus() == HospitalTransferStatus.ARRIVED) {
            throw new ConflictException("This transfer is already marked ARRIVED");
        }

        transfer.setStatus(HospitalTransferStatus.ARRIVED);
        hospitalTransferRepository.save(transfer);

        mission.setStatus(MissionStatus.COMPLETED);
        mission.setCompletedAt(java.time.Instant.now());
        missionRepository.save(mission);

        ResponseUnit unit = mission.getUnit();
        unit.setStatus(UnitStatus.AVAILABLE);
        responseUnitRepository.save(unit);

        closeOutIncidentIfAllMissionsDone(mission.getIncident());

        // Arriving completes the mission, frees the unit and may resolve the incident: every screen
        // showing any of those must hear about it.
        vitalsEventPublisher.notifyTransfersChanged();
        missionEventPublisher.publishRespondersChanged(mission.getIncident().getId());
        unitEventPublisher.notifyUnitsChanged();
        incidentEventPublisher.notifyIncidentsChanged();

        return toResponse(transfer);
    }

    @Override
    @Transactional
    public void sendVitalsUpdate(Long actorId, VitalsUpdateRequest request) {
        HospitalTransfer transfer = requireTransfer(request.hospitalTransferId());
        requireIsLead(actorId, transfer.getMission());

        Facility hospital = transfer.getHospital();
        if (hospital == null || !hospital.isRegistered()) {
            throw new ConflictException(
                    "This destination hospital isn't registered in the system -- there is no dashboard to receive live vitals");
        }

        PatientVitalsUpdate update = new PatientVitalsUpdate();
        update.setHospitalTransfer(transfer);
        update.setHeartRate(request.heartRate());
        update.setBloodPressureSystolic(request.bloodPressureSystolic());
        update.setBloodPressureDiastolic(request.bloodPressureDiastolic());
        update.setSpo2(request.spo2());
        update.setRespiratoryRate(request.respiratoryRate());
        update.setTemperatureCelsius(request.temperatureCelsius());
        update.setConsciousnessLevel(request.consciousnessLevel());
        update.setNotes(request.notes());

        PatientVitalsUpdate saved = patientVitalsUpdateRepository.save(update);

        vitalsEventPublisher.publishVitalsUpdate(transfer.getId(), toVitalsResponse(saved));
        vitalsEventPublisher.notifyVitalsChanged();
    }

    @Override
    public List<VitalsUpdateResponse> getVitalsHistory(Long actorId, Long hospitalTransferId) {
        HospitalTransfer transfer = requireTransfer(hospitalTransferId);
        requireIsLeadOrDestinationHospitalStaff(actorId, transfer);

        return patientVitalsUpdateRepository.findByHospitalTransferIdOrderByRecordedAtDesc(hospitalTransferId)
                .stream()
                .map(this::toVitalsResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<IncidentTransferVitalsResponse> getVitalsForIncident(Long callerId, Long incidentId) {
        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<IncidentTransferVitalsResponse> visible = new ArrayList<>();
        for (HospitalTransfer transfer : hospitalTransferRepository.findByIncidentId(incidentId)) {
            if (!canViewVitals(caller, transfer)) continue;

            List<VitalsUpdateResponse> updates = patientVitalsUpdateRepository
                    .findByHospitalTransferIdOrderByRecordedAtDesc(transfer.getId())
                    .stream().map(this::toVitalsResponse).toList();

            // A transfer with nothing sent is only worth showing while readings are still expected: the hospital
            // is on the system (so the crew can send) and the patient hasn't arrived yet.
            Facility hospital = transfer.getHospital();
            boolean readingsExpected = hospital != null && hospital.isRegistered()
                    && transfer.getStatus() != HospitalTransferStatus.ARRIVED;
            if (updates.isEmpty() && !readingsExpected) continue;

            visible.add(new IncidentTransferVitalsResponse(
                    transfer.getId(),
                    hospital != null ? hospital.getName() : transfer.getDestinationNameFreetext(),
                    transfer.getMission().getUnit().getPlateNumber(),
                    transfer.getStatus(),
                    updates));
        }
        return visible;
    }

    private boolean canViewVitals(User caller, HospitalTransfer transfer) {
        if (isDispatchOrAdmin(caller)) return true;

        Facility hospital = transfer.getHospital();
        if (hospital != null && caller.getFacility() != null && caller.getFacility().getId().equals(hospital.getId())) {
            return true;
        }
        // The whole crew of the ambulance, not just whoever is LEAD right now -- and still after their shift ends.
        return missionParticipantRepository.findByMissionId(transfer.getMission().getId()).stream()
                .anyMatch(participant -> participant.getUser().getId().equals(caller.getId()));
    }

    private static boolean isDispatchOrAdmin(User user) {
        return user.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(user.getRole().getRoleName().toUpperCase());
    }

    private VitalsUpdateResponse toVitalsResponse(PatientVitalsUpdate u) {
        return new VitalsUpdateResponse(
                u.getId(), u.getHeartRate(), u.getBloodPressureSystolic(), u.getBloodPressureDiastolic(),
                u.getSpo2(), u.getRespiratoryRate(), u.getTemperatureCelsius(),
                u.getConsciousnessLevel(), u.getNotes(), u.getRecordedAt());
    }

    @Override
    public HospitalTransferResponse getForMission(Long callerId, Long missionId) {
        Mission mission = requireMission(missionId);
        requireCanViewTransfer(callerId, mission);
        return hospitalTransferRepository.findByMissionId(missionId).map(this::toResponse).orElse(null);
    }

    private void requireCanViewTransfer(Long callerId, Mission mission) {
        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isDispatcherOrAdmin = caller.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        if (isDispatcherOrAdmin) return;
        if (mission.getIncident().getCitizen().getId().equals(callerId)) return;

        boolean isParticipant = missionParticipantRepository.findByMissionId(mission.getId()).stream()
                .anyMatch(p -> p.getUser().getId().equals(callerId));
        if (!isParticipant) {
            throw new IllegalArgumentException("You do not have access to this mission's hospital transfer");
        }
    }

    private void requireIsLeadOrDestinationHospitalStaff(Long actorId, HospitalTransfer transfer) {
        var leadShift = shiftAssignmentRepository
                .findByUnitIdAndEndTimeIsNullAndRoleInShift(transfer.getMission().getUnit().getId(), RoleInShift.LEAD);
        if (leadShift.isPresent() && leadShift.get().getEmployee().getId().equals(actorId)) {
            return;
        }

        User caller = userRepository.findById(actorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isDestinationStaff = caller.getFacility() != null
                && transfer.getHospital() != null
                && caller.getFacility().getId().equals(transfer.getHospital().getId());

        if (!isDestinationStaff) {
            throw new IllegalArgumentException("You do not have access to this transfer's vitals");
        }
    }

    // ---------- shared helpers ----------

    private void requireAmbulanceMission(Mission mission) {
        if (mission.getUnit().getUnitType() != UnitType.AMBULANCE) {
            throw new IllegalArgumentException("Hospital transfer only applies to AMBULANCE missions");
        }
    }

    private void requireIsLead(Long actorId, Mission mission) {
        var leadShift = shiftAssignmentRepository
                .findByUnitIdAndEndTimeIsNullAndRoleInShift(mission.getUnit().getId(), RoleInShift.LEAD)
                .orElseThrow(() -> new ConflictException("This unit has no active LEAD"));

        if (!leadShift.getEmployee().getId().equals(actorId)) {
            throw new IllegalArgumentException("Only this unit's LEAD can act on this hospital transfer");
        }
    }

    private void requireMissionStatus(Mission mission, MissionStatus expected) {
        if (mission.getStatus() != expected) {
            throw new ConflictException(
                    "Expected mission status " + expected + " but it is " + mission.getStatus());
        }
    }

    private void closeOutIncidentIfAllMissionsDone(Incident incident) {
        List<Mission> missions = missionRepository.findByIncidentId(incident.getId());
        boolean allDone = missions.stream().allMatch(m ->
                m.getStatus() == MissionStatus.COMPLETED || m.getStatus() == MissionStatus.CANCELLED);

        if (allDone) {
            incident.setStatus(IncidentStatus.RESOLVED);
            incidentRepository.save(incident);
            notificationPublisher.incidentResolved(incident);
        }
    }

    private Mission requireMission(Long id) {
        return missionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mission not found"));
    }

    private HospitalTransfer requireTransfer(Long id) {
        return hospitalTransferRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hospital transfer not found"));
    }

    private HospitalTransferResponse toResponse(HospitalTransfer transfer) {
        ResponseUnit unit = transfer.getMission().getUnit();
        Incident incident = transfer.getMission().getIncident();
        Facility unitFacility = unit.getFacility();

        return new HospitalTransferResponse(
                transfer.getId(),
                transfer.getMission().getId(),
                incident.getId(),
                transfer.getHospital() != null ? transfer.getHospital().getId() : null,
                transfer.getHospital() != null ? transfer.getHospital().getName() : null,
                transfer.getDestinationNameFreetext(),
                transfer.getStatus(),
                incident.getLatitude(), incident.getLongitude(),
                unit.getUnitType(), unit.getLatitude(), unit.getLongitude(),
                unitFacility != null ? unitFacility.getId() : null,
                unitFacility != null ? unitFacility.getLatitude() : null,
                unitFacility != null ? unitFacility.getLongitude() : null,
                transfer.getHospital() != null ? transfer.getHospital().getLatitude() : null,
                transfer.getHospital() != null ? transfer.getHospital().getLongitude() : null
        );
    }
}