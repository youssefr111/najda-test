package com.najda.backend.unit.service;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.repository.FacilityRepository;
import com.najda.backend.facility.service.FacilityService;
import com.najda.backend.unit.dto.CreateResponseUnitRequest;
import com.najda.backend.unit.dto.ResponseUnitResponse;
import com.najda.backend.unit.dto.UpdateResponseUnitRequest;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.RoleInShift;
import com.najda.backend.unit.model.ShiftAssignment;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.model.UnitType;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.unit.repository.ShiftAssignmentRepository;
import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.incident.repository.MissionRepository;
import com.najda.backend.user.repository.UserRepository;

import java.util.List;
import java.util.Set;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

@Service
public class ResponseUnitServiceImpl implements ResponseUnitService {

    private final ResponseUnitRepository responseUnitRepository;
    private final FacilityRepository facilityRepository;
    private final FacilityService facilityService;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final MissionRepository missionRepository;
    private final UnitEventPublisher unitEventPublisher;
    public ResponseUnitServiceImpl(
            ResponseUnitRepository responseUnitRepository,
            FacilityRepository facilityRepository,
            FacilityService facilityService,
            ShiftAssignmentRepository shiftAssignmentRepository,
            MissionRepository missionRepository,
            UserRepository userRepository,
            UnitEventPublisher unitEventPublisher) {
        this.responseUnitRepository = responseUnitRepository;
        this.facilityRepository = facilityRepository;
        this.facilityService = facilityService;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.missionRepository = missionRepository;
        this.unitEventPublisher = unitEventPublisher;
    }

    @Override
    public ResponseUnitResponse create(CreateResponseUnitRequest request) {
        if (request.unitType() == UnitType.FIRST_RESPONDER) {
            throw new IllegalArgumentException(
                    "FIRST_RESPONDER units are created automatically during employee registration, not here");
        }

        ResponseUnit unit = new ResponseUnit();
        unit.setPlateNumber(request.plateNumber());
        unit.setUnitType(request.unitType());
        unit.setStatus(UnitStatus.OFFLINE);

        if (request.facilityId() != null) {
            // facilityService.requireFacilityOfType(request.facilityId(),
            //         FacilityType.AMBULANCE_STATION, FacilityType.FIRE_STATION, FacilityType.POLICE_STATION);
            Facility facility = facilityRepository.findById(request.facilityId())
                    .orElseThrow(() -> new ResourceNotFoundException("Facility not found"));
            unit.setFacility(facility);
            facilityService.markRegistered(request.facilityId());
        }

        return toResponse(responseUnitRepository.save(unit));
    }

    @Override
    public List<ResponseUnitResponse> getAll() {
        return responseUnitRepository.findAll().stream().map(this::toResponse).toList();
    }


    private static final Set<String> BYPASSES_FACILITY_ROLES = Set.of("FIRST_RESPONDER");

    @Override
    public List<ResponseUnitResponse> getUnitsForFacility(Long facilityId, String roleName, Long callerId) {
        if ("FIRST_RESPONDER".equalsIgnoreCase(roleName)) {
            return responseUnitRepository.findByAssignedEmployeeId(callerId)
                    .map(u -> List.of(toResponse(u))).orElse(List.of());
        }
        UnitType matchingType = switch (roleName.toUpperCase()) {
            case "AMBULANCE_CREW" -> UnitType.AMBULANCE;
            case "POLICE" -> UnitType.POLICE_CAR;
            case "FIREFIGHTER" -> UnitType.FIRE_TRUCK;
            case "FIRST_RESPONDER" -> UnitType.FIRST_RESPONDER;
            default -> throw new IllegalArgumentException("This role has no associated unit type");
        };

        if (BYPASSES_FACILITY_ROLES.contains(roleName.toUpperCase())) {
            return responseUnitRepository.findByUnitType(matchingType).stream().map(this::toResponse).toList();
        }

        if (facilityId == null) {
            return List.of();
        }
        return responseUnitRepository.findByUnitTypeAndFacilityId(matchingType, facilityId).stream().map(this::toResponse).toList();
    }

    @Override
    public ResponseUnitResponse update(Long unitId, UpdateResponseUnitRequest request) {
        ResponseUnit unit = responseUnitRepository.findById(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));

        unit.setPlateNumber(request.plateNumber());
        unit.setUnitType(request.unitType());

        if (request.facilityId() != null) {
            // facilityService.requireFacilityOfType(request.facilityId(),
            //         FacilityType.AMBULANCE_STATION, FacilityType.FIRE_STATION, FacilityType.POLICE_STATION);
            Facility facility = facilityRepository.findById(request.facilityId())
                    .orElseThrow(() -> new ResourceNotFoundException("Facility not found"));
            unit.setFacility(facility);
        } else {
            unit.setFacility(null);
        }

        return toResponse(responseUnitRepository.save(unit));
    }

    @Override
    public ResponseUnitResponse updateLocation(Long callerId, Long unitId, Double latitude, Double longitude) {
        ResponseUnit unit = responseUnitRepository.findById(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));

        // Only this unit's own LEAD reports its position -- their device is
        // the one actually in the vehicle. CREW members ride along but don't
        // separately report location for the same unit.
        ShiftAssignment leadShift = shiftAssignmentRepository
                .findByUnitIdAndEndTimeIsNullAndRoleInShift(unitId, RoleInShift.LEAD)
                .orElseThrow(() -> new ConflictException("This unit has no active LEAD"));
        if (!leadShift.getEmployee().getId().equals(callerId)) {
            throw new IllegalArgumentException("Only this unit's LEAD can update its location");
        }

        unit.setLatitude(latitude);
        unit.setLongitude(longitude);
        ResponseUnitResponse response = toResponse(responseUnitRepository.save(unit));
        unitEventPublisher.notifyUnitsChanged();
        return response;
    }

    private static final java.util.Set<MissionStatus> ACTIVE_MISSION_STATUSES =
        java.util.EnumSet.of(MissionStatus.OFFERED, MissionStatus.ACCEPTED, MissionStatus.EN_ROUTE, MissionStatus.ARRIVED);

    @Override
    @Transactional
    public void reconcileStatuses() {
        // A unit is legitimately BUSY only if it has a mission still actually
        // in progress. Anything BUSY with no such mission is stale.
        List<ResponseUnit> busyUnits = responseUnitRepository.findByStatus(UnitStatus.BUSY);
        for (ResponseUnit unit : busyUnits) {
            boolean hasActiveMission = missionRepository.findByUnitId(unit.getId()).stream()
                    .anyMatch(m -> ACTIVE_MISSION_STATUSES.contains(m.getStatus()));
            if (!hasActiveMission) {
                unit.setStatus(UnitStatus.AVAILABLE);
                responseUnitRepository.save(unit);
            }
        }
    }

    @Override
    public void delete(Long unitId) {
        ResponseUnit unit = responseUnitRepository.findById(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));

        // Confirm these two finder methods exist as written -- I haven't
        // re-read MissionRepository/ShiftAssignmentRepository fresh this
        // session, and guessing method names wrong has bitten this build
        // before. Add them if missing rather than assume.
        boolean hasMissionHistory = !missionRepository.findByUnitId(unitId).isEmpty();
        if (hasMissionHistory) {
            throw new ConflictException("This unit has mission history and can't be deleted -- it's part of the operational record.");
        }

        shiftAssignmentRepository.deleteAll(shiftAssignmentRepository.findByUnitId(unitId));
        responseUnitRepository.delete(unit);
    }

    private ResponseUnitResponse toResponse(ResponseUnit unit) {
        String currentLeadName = shiftAssignmentRepository
                .findByUnitIdAndEndTimeIsNullAndRoleInShift(unit.getId(), RoleInShift.LEAD)
                .map(shift -> shift.getEmployee().getFirstName() + " " + shift.getEmployee().getLastName())
                .orElse(null);

        return new ResponseUnitResponse(
                unit.getId(), unit.getPlateNumber(), unit.getUnitType(),
                unit.getStatus(), unit.getFacility() != null ? unit.getFacility().getId() : null,
                unit.getFacility() != null ? unit.getFacility().getName() : null,
                unit.getFacility() != null ? unit.getFacility().getLatitude() : null,
                unit.getFacility() != null ? unit.getFacility().getLongitude() : null,
                unit.getLatitude(), unit.getLongitude(), currentLeadName);
    }
}