package com.najda.backend.unit.service;

import com.najda.backend.audit.model.AuditLog;
import com.najda.backend.audit.repository.AuditLogRepository;
import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.unit.model.RoleInShift;
import com.najda.backend.unit.model.ShiftAssignment;
import com.najda.backend.unit.model.ResponseUnit;
import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.model.UnitType;
import com.najda.backend.unit.dto.ShiftAssignmentResponse;
import com.najda.backend.unit.repository.ShiftAssignmentRepository;
import com.najda.backend.unit.repository.ResponseUnitRepository;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShiftServiceImpl implements ShiftService {

    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final ResponseUnitRepository responseUnitRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public ShiftServiceImpl(
            ShiftAssignmentRepository shiftAssignmentRepository,
            ResponseUnitRepository responseUnitRepository,
            UserRepository userRepository,
            AuditLogRepository auditLogRepository) {
        this.shiftAssignmentRepository = shiftAssignmentRepository;
        this.responseUnitRepository = responseUnitRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    @Transactional
    public ShiftAssignmentResponse startShift(Long employeeId, Long unitId) {
        User employee = requireUser(employeeId);
        requireNoActiveShift(employeeId);

        ResponseUnit unit = responseUnitRepository.findByIdForUpdate(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));

        if (shiftAssignmentRepository
                .findByUnitIdAndEndTimeIsNullAndRoleInShift(unitId, RoleInShift.LEAD)
                .isPresent()) {
            throw new ConflictException("This unit already has an active LEAD");
        }

        requireEligible(employee, unit);

        ShiftAssignment shift = new ShiftAssignment();
        shift.setEmployee(employee);
        shift.setUnit(unit);
        shift.setRoleInShift(RoleInShift.LEAD);
        shift.setStartTime(LocalDateTime.now());
        shiftAssignmentRepository.save(shift);

        unit.setStatus(UnitStatus.AVAILABLE);
        responseUnitRepository.save(unit);

        return toResponse(shift);
    }

    @Override
    @Transactional
    public ShiftAssignmentResponse joinShift(Long employeeId, Long unitId) {
        User employee = requireUser(employeeId);
        requireNoActiveShift(employeeId);

        ResponseUnit unit = responseUnitRepository.findById(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));

        if (unit.getUnitType() == UnitType.FIRST_RESPONDER) {
            throw new ConflictException("A FIRST_RESPONDER unit has no CREW positions to join");
        }

        boolean unitHasActiveLead = shiftAssignmentRepository
                .findByUnitIdAndEndTimeIsNullAndRoleInShift(unitId, RoleInShift.LEAD)
                .isPresent();

        if (!unitHasActiveLead) {
            throw new ConflictException("This unit has no active LEAD to crew for yet");
        }

        requireEligible(employee, unit);

        ShiftAssignment shift = new ShiftAssignment();
        shift.setEmployee(employee);
        shift.setUnit(unit);
        shift.setRoleInShift(RoleInShift.CREW);
        shift.setStartTime(LocalDateTime.now());
        shiftAssignmentRepository.save(shift);

        return toResponse(shift);
    }

    /** AMBULANCE and FIRST_RESPONDER bypass the facility requirement
        entirely -- a private ambulance doesn't need a fixed station. But
        if an admin has explicitly rostered specific employees to a unit
        (any type), that roster always wins over the facility check --
        it's the more precise, admin-controlled signal. */
    private void requireEligible(User employee, ResponseUnit unit) {
        boolean bypassesFacility = unit.getUnitType() == UnitType.AMBULANCE
                || unit.getUnitType() == UnitType.FIRST_RESPONDER;

        if (bypassesFacility) {
            return;
        }

        if (unit.getFacility() == null) {
            throw new ConflictException("This unit has no assigned facility -- an admin must link it to one before it can be staffed");
        }
        if (employee.getFacility() == null || !employee.getFacility().getId().equals(unit.getFacility().getId())) {
            throw new IllegalArgumentException("You can only join units based at your own facility");
        }
    }

    @Override
    public ShiftAssignmentResponse getMyShift(Long employeeId) {
        return shiftAssignmentRepository.findByEmployeeIdAndEndTimeIsNull(employeeId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Override
    public List<ShiftAssignmentResponse> getCrewForUnit(Long unitId) {
        return shiftAssignmentRepository.findByUnitIdAndEndTimeIsNull(unitId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void leaveShift(Long employeeId) {
        ShiftAssignment shift = shiftAssignmentRepository.findByEmployeeIdAndEndTimeIsNull(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("No active shift for this employee"));

        if (shift.getRoleInShift() == RoleInShift.LEAD) {
            throw new ConflictException(
                    "A LEAD cannot leave individually -- use endShift, which ends the whole unit's shift");
        }

        shift.setEndTime(LocalDateTime.now());
        shiftAssignmentRepository.save(shift);
    }

    @Override
    @Transactional
    public void endShift(Long employeeId) {
        ShiftAssignment leadShift = shiftAssignmentRepository.findByEmployeeIdAndEndTimeIsNull(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("No active shift for this employee"));

        if (leadShift.getRoleInShift() != RoleInShift.LEAD) {
            throw new ConflictException("Only the LEAD can end the unit's shift -- see leaveShift for CREW");
        }

        closeOutUnitShift(leadShift.getUnit().getId());
    }

    @Override
    @Transactional
    public void adminForceEndShift(Long adminId, Long unitId) {
        User admin = requireUser(adminId);

        List<ShiftAssignment> activeShifts =
                shiftAssignmentRepository.findByUnitIdAndEndTimeIsNull(unitId);

        if (activeShifts.isEmpty()) {
            throw new ResourceNotFoundException("No active shift on this unit");
        }

        closeOutUnitShift(unitId);

        AuditLog log = new AuditLog();
        log.setActorUserId(admin.getId());
        log.setAction("ADMIN_FORCE_END_SHIFT");
        log.setTargetUserId(activeShifts.get(0).getEmployee().getId());
        log.setDetails("Shift force-ended for unit ID " + unitId
                + " (" + activeShifts.size() + " assignment(s) closed) by admin override");
        auditLogRepository.save(log);
    }

    private void closeOutUnitShift(Long unitId) {
        List<ShiftAssignment> activeShifts =
                shiftAssignmentRepository.findByUnitIdAndEndTimeIsNull(unitId);

        LocalDateTime now = LocalDateTime.now();
        for (ShiftAssignment shift : activeShifts) {
            shift.setEndTime(now);
            shiftAssignmentRepository.save(shift);
        }

        ResponseUnit unit = responseUnitRepository.findById(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));
        unit.setStatus(UnitStatus.OFFLINE);
        responseUnitRepository.save(unit);
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void requireNoActiveShift(Long employeeId) {
        if (shiftAssignmentRepository.findByEmployeeIdAndEndTimeIsNull(employeeId).isPresent()) {
            throw new ConflictException("This employee already has an active shift");
        }
    }

    private ShiftAssignmentResponse toResponse(ShiftAssignment shift) {
        return new ShiftAssignmentResponse(
                shift.getId(),
                shift.getEmployee().getId(),
                shift.getEmployee().getFirstName() + " " + shift.getEmployee().getLastName(),
                shift.getUnit().getId(),
                shift.getUnit().getPlateNumber(),
                shift.getRoleInShift(),
                shift.getStartTime()
        );
    }
}