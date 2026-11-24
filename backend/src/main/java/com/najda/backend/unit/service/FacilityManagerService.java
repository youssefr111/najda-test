package com.najda.backend.unit.service;

import com.najda.backend.audit.model.AuditLog;
import com.najda.backend.audit.repository.AuditLogRepository;
import com.najda.backend.auth.dto.RegisterEmployeeRequest;
import com.najda.backend.auth.service.AuthService;
import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.service.FacilityService;
import com.najda.backend.incident.model.Mission;
import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.incident.repository.MissionRepository;
import com.najda.backend.unit.dto.CreateResponseUnitRequest;
import com.najda.backend.unit.dto.ResponseUnitResponse;
import com.najda.backend.unit.dto.UnitDeleteImpact;
import com.najda.backend.unit.dto.UpdateResponseUnitRequest;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.unit.repository.ShiftAssignmentRepository;
import com.najda.backend.user.dto.UserResponse;
import com.najda.backend.user.mapper.UserMapper;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.user.service.UserService;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Everything a FACILITY_MANAGER may do, and the only place their limits are enforced. They manage ONE facility:
 * its units (the type is fixed by the facility) and its staff accounts (the role is limited by the facility, the
 * facility is theirs). Every rule here is checked on the server whatever the client sends, and every change is
 * written to the audit log.
 *
 * Admins also delete units through {@link #deleteUnit}, so they get the same "retire it, do not erase its history"
 * behaviour.
 */
@Service
public class FacilityManagerService {

    private static final Set<String> ADMIN_ROLES = Set.of("ADMIN", "SUPER_ADMIN");
    private static final Set<MissionStatus> LIVE = Set.of(
            MissionStatus.OFFERED, MissionStatus.ACCEPTED, MissionStatus.EN_ROUTE, MissionStatus.ARRIVED);

    private final ResponseUnitService responseUnitService;
    private final ResponseUnitRepository unitRepository;
    private final MissionRepository missionRepository;
    private final ShiftAssignmentRepository shiftRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final UserMapper userMapper;
    private final AuthService authService;
    private final AuditLogRepository auditLogRepository;
    private final UnitEventPublisher unitEventPublisher;
    private final FacilityService facilityService;

    public FacilityManagerService(
            ResponseUnitService responseUnitService,
            ResponseUnitRepository unitRepository,
            MissionRepository missionRepository,
            ShiftAssignmentRepository shiftRepository,
            UserRepository userRepository,
            UserService userService,
            UserMapper userMapper,
            AuthService authService,
            AuditLogRepository auditLogRepository,
            UnitEventPublisher unitEventPublisher,
            FacilityService facilityService) {
        this.responseUnitService = responseUnitService;
        this.unitRepository = unitRepository;
        this.missionRepository = missionRepository;
        this.shiftRepository = shiftRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.userMapper = userMapper;
        this.authService = authService;
        this.auditLogRepository = auditLogRepository;
        this.unitEventPublisher = unitEventPublisher;
        this.facilityService = facilityService;
    }

    // ---------------------------------------------------------------- identity ---

    private static boolean isAdmin(User user) {
        return user.getRole() != null && ADMIN_ROLES.contains(user.getRole().getRoleName().toUpperCase());
    }

    /** The caller as a manager of a facility, or 403. */
    public Facility requireFacility(User caller) {
        boolean manager = caller.getRole() != null && "FACILITY_MANAGER".equalsIgnoreCase(caller.getRole().getRoleName());
        if (!manager || caller.getFacility() == null) {
            throw new AccessDeniedException("Only a facility manager with an assigned facility can do this");
        }
        return caller.getFacility();
    }

    // ------------------------------------------------------------------- units ---

    public List<ResponseUnitResponse> units(User caller) {
        Long facilityId = requireFacility(caller).getId();
        return responseUnitService.getAll().stream().filter(unit -> facilityId.equals(unit.facilityId())).toList();
    }

    public ResponseUnitResponse createUnit(User caller, String plateNumber) {
        Facility facility = requireFacility(caller);
        ResponseUnitResponse created = responseUnitService.create(new CreateResponseUnitRequest(
                plateNumber.trim(), FacilityManagerPolicy.unitTypeFor(facility.getFacilityType()), facility.getId()));
        audit(caller, "MANAGER_CREATE_UNIT", null, "Created unit " + created.plateNumber() + " at " + facility.getName());
        return created;
    }

    public ResponseUnitResponse updateUnit(User caller, Long unitId, String plateNumber) {
        Facility facility = requireFacility(caller);
        ResponseUnit unit = requireOwnUnit(facility, unitId);
        // Only the plate is editable: the type and the facility are fixed by who the manager is.
        ResponseUnitResponse updated = responseUnitService.update(
                unitId, new UpdateResponseUnitRequest(plateNumber.trim(), unit.getUnitType(), facility.getId()));
        audit(caller, "MANAGER_UPDATE_UNIT", null, "Renamed unit " + unit.getPlateNumber() + " to " + updated.plateNumber());
        return updated;
    }

    @Transactional(readOnly = true)
    public UnitDeleteImpact deleteImpact(User caller, Long unitId) {
        ResponseUnit unit = scopedUnit(caller, unitId);
        List<Mission> missions = missionRepository.findByUnitId(unitId);
        int active = (int) missions.stream().filter(m -> LIVE.contains(m.getStatus())).count();
        boolean onShift = !shiftRepository.findByUnitIdAndEndTimeIsNull(unitId).isEmpty();
        return new UnitDeleteImpact(
                unit.getPlateNumber(), missions.size(), active, onShift,
                missions.isEmpty() ? "DELETE" : "ARCHIVE", active > 0 || onShift);
    }

    /** Deletes a unit with no history; retires one that has any. Returns the outcome ("DELETED" or "ARCHIVED"). */
    @Transactional
    public String deleteUnit(User caller, Long unitId) {
        ResponseUnit unit = scopedUnit(caller, unitId);
        UnitDeleteImpact impact = deleteImpact(caller, unitId);
        if (impact.blocked()) {
            throw new ConflictException(impact.activeMissionCount() > 0
                    ? "This unit is on a live mission right now -- wait for it to finish first"
                    : "Someone is on shift with this unit -- they must end their shift first");
        }

        if (impact.missionCount() == 0) {
            responseUnitService.delete(unitId);
            audit(caller, "UNIT_DELETE", null, "Deleted unit " + impact.plateNumber() + " (no history)");
            return "DELETED";
        }

        unit.setArchivedAt(Instant.now());
        unit.setStatus(UnitStatus.OFFLINE);
        unitRepository.save(unit);
        facilityService.refreshRegistered(unit.getFacility() != null ? unit.getFacility().getId() : null);
        unitEventPublisher.notifyUnitsChanged();
        audit(caller, "UNIT_ARCHIVE", null,
                "Retired unit " + impact.plateNumber() + " (kept: " + impact.missionCount() + " missions of history)");
        return "ARCHIVED";
    }

    /** A manager's own unit, or any unit for an admin. */
    private ResponseUnit scopedUnit(User caller, Long unitId) {
        if (isAdmin(caller)) {
            return unitRepository.findById(unitId).orElseThrow(() -> new ResourceNotFoundException("Unit not found"));
        }
        return requireOwnUnit(requireFacility(caller), unitId);
    }

    private ResponseUnit requireOwnUnit(Facility facility, Long unitId) {
        ResponseUnit unit = unitRepository.findById(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));
        boolean mine = unit.getFacility() != null && unit.getFacility().getId().equals(facility.getId());
        if (!mine || unit.getArchivedAt() != null) {
            throw new AccessDeniedException("This unit does not belong to your facility");
        }
        return unit;
    }

    // ------------------------------------------------------------------- staff ---

    private Set<String> allowedRoles(Facility facility) {
        return FacilityManagerPolicy.staffRolesFor(facility.getFacilityType());
    }

    @Transactional(readOnly = true)
    public List<UserResponse> staff(User caller) {
        Facility facility = requireFacility(caller);
        Set<String> roles = allowedRoles(facility);
        List<User> members = userRepository.findManagedStaff(facility.getId()).stream()
                .filter(user -> !user.getId().equals(caller.getId()))
                .filter(user -> user.getRole() != null && roles.contains(user.getRole().getRoleName().toUpperCase()))
                .toList();
        return userMapper.toResponses(members);
    }

    /** Creates an account for THIS facility, in a role this facility may have. Role and facility come from the server. */
    public ResponseEntity<?> createStaff(User caller, RegisterEmployeeRequest request) {
        Facility facility = requireFacility(caller);
        String role = request.roleName() == null ? "" : request.roleName().trim().toUpperCase();
        if (!allowedRoles(facility).contains(role)) {
            throw new IllegalArgumentException("A " + facility.getFacilityType() + " can only create: " + allowedRoles(facility));
        }
        ResponseEntity<?> response = authService.registerEmployee(new RegisterEmployeeRequest(
                request.firstName(), request.lastName(), request.email(), request.phone(),
                request.gender(), role, facility.getId(), request.addressDetails()));
        if (response.getStatusCode().is2xxSuccessful()) {
            audit(caller, "MANAGER_CREATE_STAFF", null, "Created " + role + " account " + request.email() + " at " + facility.getName());
        }
        return response;
    }

    public ResponseEntity<?> setStaffEnabled(User caller, Long userId, boolean enabled) {
        Facility facility = requireFacility(caller);
        User target = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean sameFacility = target.getFacility() != null && target.getFacility().getId().equals(facility.getId());
        boolean allowedRole = target.getRole() != null && allowedRoles(facility).contains(target.getRole().getRoleName().toUpperCase());
        if (!sameFacility || !allowedRole || target.getId().equals(caller.getId())) {
            throw new AccessDeniedException("You can only manage the staff of your own facility");
        }

        ResponseEntity<?> response = enabled ? userService.enableUser(userId) : userService.disableUser(userId);
        if (response.getStatusCode().is2xxSuccessful()) {
            audit(caller, enabled ? "MANAGER_ENABLE_STAFF" : "MANAGER_DISABLE_STAFF", userId, target.getEmail());
        }
        return response;
    }

    private void audit(User actor, String action, Long targetUserId, String details) {
        AuditLog log = new AuditLog();
        log.setActorUserId(actor.getId());
        log.setAction(action);
        log.setTargetUserId(targetUserId);
        log.setDetails(details);
        auditLogRepository.save(log);
    }
}
