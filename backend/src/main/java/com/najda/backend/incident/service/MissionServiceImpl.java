package com.najda.backend.incident.service;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.MissionResponse;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.model.IncidentStatus;
import com.najda.backend.incident.model.Mission;
import com.najda.backend.user.model.User;
import com.najda.backend.incident.model.MissionParticipant;
import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.incident.repository.IncidentRepository;
import com.najda.backend.incident.repository.MissionParticipantRepository;
import com.najda.backend.incident.repository.MissionRepository;
import com.najda.backend.unit.model.RoleInShift;
import com.najda.backend.unit.model.ShiftAssignment;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.model.UnitType;
import com.najda.backend.unit.repository.ShiftAssignmentRepository;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.Set;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class MissionServiceImpl implements MissionService {

    private final MissionRepository missionRepository;
    private final MissionParticipantRepository missionParticipantRepository;
    private final IncidentRepository incidentRepository;
    private final ResponseUnitRepository responseUnitRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final UserRepository userRepository;
    private final MissionEventPublisher missionEventPublisher;

    private static final Set<IncidentStatus> TERMINAL_STATUSES = EnumSet.of(IncidentStatus.RESOLVED, IncidentStatus.CANCELLED);
    private static final Set<IncidentStatus> OPEN_STATUSES =
            EnumSet.of(IncidentStatus.NEW, IncidentStatus.AI_PROCESSED, IncidentStatus.DISPATCHER_REVIEW);

    public MissionServiceImpl(
            MissionRepository missionRepository,
            MissionParticipantRepository missionParticipantRepository,
            IncidentRepository incidentRepository,
            ResponseUnitRepository responseUnitRepository,
            ShiftAssignmentRepository shiftAssignmentRepository,
            UserRepository userRepository,
            MissionEventPublisher missionEventPublisher) {
        this.missionRepository = missionRepository;
        this.missionParticipantRepository = missionParticipantRepository;
        this.incidentRepository = incidentRepository;
        this.responseUnitRepository = responseUnitRepository;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.userRepository = userRepository;
        this.missionEventPublisher = missionEventPublisher;
    }

    @Override
    @Transactional
    public MissionResponse assignUnitMission(Long dispatcherId, Long incidentId, Long unitId) {
        Incident incident = requireIncident(incidentId);

        if (TERMINAL_STATUSES.contains(incident.getStatus())) {
            throw new ConflictException("This incident is already " + incident.getStatus() + " -- units can no longer be assigned to it");
        }

        ResponseUnit unit = responseUnitRepository.findByIdForUpdate(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));

        if (unit.getStatus() != UnitStatus.AVAILABLE) {
            throw new ConflictException("This unit is no longer available -- it may have just been assigned");
        }

        shiftAssignmentRepository
                .findByUnitIdAndEndTimeIsNullAndRoleInShift(unitId, RoleInShift.LEAD)
                .orElseThrow(() -> new ConflictException("This unit has no active LEAD"));

        Mission mission = new Mission();
        mission.setIncident(incident);
        mission.setUnit(unit);
        mission.setStatus(MissionStatus.OFFERED);
        mission.setOfferedAt(LocalDateTime.now());
        missionRepository.save(mission);

        unit.setStatus(UnitStatus.BUSY);
        responseUnitRepository.save(unit);

        List<ShiftAssignment> activeShifts = shiftAssignmentRepository.findByUnitIdAndEndTimeIsNull(unitId);
        for (ShiftAssignment shift : activeShifts) {
            MissionParticipant participant = new MissionParticipant();
            participant.setMission(mission);
            participant.setUser(shift.getEmployee());
            missionParticipantRepository.save(participant);
        }

        if (OPEN_STATUSES.contains(incident.getStatus())) {
            incident.setStatus(IncidentStatus.ASSIGNED);
            incidentRepository.save(incident);
        }

        MissionResponse response = toResponse(mission);
        missionEventPublisher.publishMissionUpdated(response);
        return response;
    }

    @Override
    public List<MissionResponse> getMissionsForIncident(Long callerId, Long incidentId) {
        Incident incident = requireIncident(incidentId);
        requireCanViewMissions(callerId, incident);
        return missionRepository.findByIncidentId(incidentId).stream().map(this::toResponse).toList();
    }

    @SuppressWarnings("null")
    @Override
    public List<MissionResponse> getMyMissions(Long userId) {
        return missionParticipantRepository.findByUserId(userId).stream()
                .map(MissionParticipant::getMission)
                .distinct()
                .sorted(Comparator.comparing(Mission::getOfferedAt).reversed())
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public MissionResponse acceptMission(Long actorId, Long missionId) {
        Mission mission = requireMission(missionId);
        requireMissionStatus(mission, MissionStatus.OFFERED);
        requireIsLead(actorId, mission);

        mission.setStatus(MissionStatus.ACCEPTED);
        mission.setAcceptedAt(LocalDateTime.now());
        missionRepository.save(mission);

        ResponseUnit unit = mission.getUnit();
        unit.setStatus(UnitStatus.BUSY);
        responseUnitRepository.save(unit);

        MissionResponse response = toResponse(mission);
        missionEventPublisher.publishMissionUpdated(response);
        return response;
    }

    @Override
    @Transactional
    public MissionResponse rejectMission(Long actorId, Long missionId, String reason) {
        Mission mission = requireMission(missionId);
        requireMissionStatus(mission, MissionStatus.OFFERED);
        requireIsLead(actorId, mission);

        mission.setStatus(MissionStatus.REJECTED);
        mission.setRejectionReason(reason);
        missionRepository.save(mission);

        ResponseUnit unit = mission.getUnit();
        unit.setStatus(UnitStatus.AVAILABLE);
        responseUnitRepository.save(unit);

        MissionResponse response = toResponse(mission);
        missionEventPublisher.publishMissionUpdated(response);
        return response;
    }

    @Override
    @Transactional
    public MissionResponse withdrawMission(Long actorId, Long missionId) {
        Mission mission = requireMission(missionId);
        requireIsLead(actorId, mission);

        if (mission.getStatus() != MissionStatus.ACCEPTED && mission.getStatus() != MissionStatus.EN_ROUTE) {
            throw new ConflictException("Only an ACCEPTED or EN_ROUTE mission can be withdrawn -- once ARRIVED, ask a dispatcher to cancel it instead");
        }

        return performCancel(mission);
    }

    @Override
    @Transactional
    public MissionResponse cancelMission(Long callerId, Long missionId) {
        Mission mission = requireMission(missionId);
        User caller = userRepository.findById(callerId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isDispatcherOrAdmin = caller.getRole() != null
                && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN").contains(caller.getRole().getRoleName().toUpperCase());
        if (!isDispatcherOrAdmin) {
            throw new IllegalArgumentException("Only a dispatcher or admin can cancel a unit assignment");
        }
        if (mission.getStatus() == MissionStatus.COMPLETED || mission.getStatus() == MissionStatus.CANCELLED || mission.getStatus() == MissionStatus.REJECTED) {
            throw new ConflictException("This mission is already " + mission.getStatus());
        }

        return performCancel(mission);
    }

    /** Shared by both cancelMission (dispatcher/admin, any non-terminal
        status) and withdrawMission (LEAD self-service, ACCEPTED/EN_ROUTE
        only) -- the state transition is identical, only who's allowed to
        trigger it and from which statuses differs. */
    private MissionResponse performCancel(Mission mission) {
        mission.setStatus(MissionStatus.CANCELLED);
        missionRepository.save(mission);

        ResponseUnit unit = mission.getUnit();
        unit.setStatus(UnitStatus.AVAILABLE);
        responseUnitRepository.save(unit);

        Incident incident = mission.getIncident();
        boolean anyStillActive = missionRepository.findByIncidentId(incident.getId()).stream()
                .anyMatch(m -> !m.getId().equals(mission.getId())
                        && m.getStatus() != MissionStatus.COMPLETED && m.getStatus() != MissionStatus.CANCELLED && m.getStatus() != MissionStatus.REJECTED);
        if (!anyStillActive && incident.getStatus() == IncidentStatus.ASSIGNED) {
            incident.setStatus(IncidentStatus.DISPATCHER_REVIEW);
            incidentRepository.save(incident);
        }

        MissionResponse response = toResponse(mission);
        missionEventPublisher.publishMissionUpdated(response);
        return response;
    }

    @Override
    @Transactional
    public MissionResponse markEnRoute(Long actorId, Long missionId) {
        Mission mission = requireMission(missionId);
        requireMissionStatus(mission, MissionStatus.ACCEPTED);
        requireIsLead(actorId, mission);

        mission.setStatus(MissionStatus.EN_ROUTE);
        missionRepository.save(mission);

        MissionResponse response = toResponse(mission);
        missionEventPublisher.publishMissionUpdated(response);
        return response;
    }

    @Override
    @Transactional
    public MissionResponse markArrived(Long actorId, Long missionId) {
        Mission mission = requireMission(missionId);
        requireMissionStatus(mission, MissionStatus.EN_ROUTE);
        requireIsLead(actorId, mission);

        mission.setStatus(MissionStatus.ARRIVED);
        mission.setArrivedAt(LocalDateTime.now());
        missionRepository.save(mission);

        MissionResponse response = toResponse(mission);
        missionEventPublisher.publishMissionUpdated(response);
        return response;
    }

    @Override
    @Transactional
    public MissionResponse completeMission(Long actorId, Long missionId) {
        Mission mission = requireMission(missionId);
        requireMissionStatus(mission, MissionStatus.ARRIVED);
        requireIsLead(actorId, mission);

        if (mission.getUnit().getUnitType() == UnitType.AMBULANCE) {
            throw new ConflictException(
                    "AMBULANCE missions complete via hospital arrival, not this endpoint -- see HospitalTransferService");
        }

        mission.setStatus(MissionStatus.COMPLETED);
        mission.setCompletedAt(LocalDateTime.now());
        missionRepository.save(mission);

        ResponseUnit unit = mission.getUnit();
        unit.setStatus(UnitStatus.AVAILABLE);
        responseUnitRepository.save(unit);

        closeOutIncidentIfAllMissionsDone(mission.getIncident());

        MissionResponse response = toResponse(mission);
        missionEventPublisher.publishMissionUpdated(response);
        return response;
    }

    // ---------- shared helpers ----------

    private void requireIsLead(Long actorId, Mission mission) {
        ShiftAssignment leadShift = shiftAssignmentRepository
                .findByUnitIdAndEndTimeIsNullAndRoleInShift(mission.getUnit().getId(), RoleInShift.LEAD)
                .orElseThrow(() -> new ConflictException("This unit has no active LEAD"));

        if (!leadShift.getEmployee().getId().equals(actorId)) {
            throw new IllegalArgumentException("Only this unit's LEAD can act on this mission");
        }
    }

    private void requireCanViewMissions(Long callerId, Incident incident) {
        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isDispatcherOrAdmin = caller.getRole() != null && List.of("DISPATCHER", "ADMIN", "SUPER_ADMIN")
                .contains(caller.getRole().getRoleName().toUpperCase());
        if (isDispatcherOrAdmin || incident.getCitizen().getId().equals(callerId)) {
            return;
        }

        boolean isParticipant = missionRepository.findByIncidentId(incident.getId()).stream()
                .flatMap(m -> missionParticipantRepository.findByMissionId(m.getId()).stream())
                .anyMatch(p -> p.getUser().getId().equals(callerId));

        if (!isParticipant) {
            throw new IllegalArgumentException("You do not have access to this incident's missions");
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
                m.getStatus() == MissionStatus.COMPLETED || m.getStatus() == MissionStatus.CANCELLED || m.getStatus() == MissionStatus.REJECTED);

        if (allDone) {
            incident.setStatus(IncidentStatus.RESOLVED);
            incidentRepository.save(incident);
        }
    }

    private Incident requireIncident(Long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
    }

    private Mission requireMission(Long id) {
        return missionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mission not found"));
    }

    private MissionResponse toResponse(Mission mission) {
        List<String> participantNames = missionParticipantRepository.findByMissionId(mission.getId())
                .stream()
                .map(p -> p.getUser().getFirstName() + " " + p.getUser().getLastName())
                .toList();

        return new MissionResponse(
                mission.getId(),
                mission.getIncident().getId(),
                mission.getUnit().getUnitType(),
                mission.getUnit().getId(),
                mission.getUnit().getPlateNumber(),
                mission.getStatus(),
                participantNames,
                mission.getOfferedAt(),
                mission.getAcceptedAt(),
                mission.getArrivedAt(),
                mission.getCompletedAt()
        );
    }
}