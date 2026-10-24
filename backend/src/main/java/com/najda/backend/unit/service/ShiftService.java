package com.najda.backend.unit.service;

import com.najda.backend.unit.dto.ShiftAssignmentResponse;
import java.util.List;

public interface ShiftService {

    /** LEAD-only. Fails if the employee already has an active shift
        anywhere, or if this unit already has an active LEAD. */
    ShiftAssignmentResponse startShift(Long employeeId, Long unitId);

    /** CREW-only. Fails if the employee already has an active shift, if
        the target unit has no active LEAD yet, or if the unit is a
        FIRST_RESPONDER (one-person units have no CREW positions). */
    ShiftAssignmentResponse joinShift(Long employeeId, Long unitId);

    /** Null if the caller has no active shift right now -- a normal state, not an error. */
    ShiftAssignmentResponse getMyShift(Long employeeId);

    /** Everyone (LEAD + CREW) currently active on this unit. */
    List<ShiftAssignmentResponse> getCrewForUnit(Long unitId);

    /** CREW-only, for stepping away individually without ending the whole
        unit's shift. LEAD cannot use this -- see endShift. */
    void leaveShift(Long employeeId);

    /** LEAD-only. Closes the LEAD's own assignment AND every CREW
        assignment on the same unit, and takes the unit OFFLINE. */
    void endShift(Long employeeId);

    /** ADMIN/SUPER_ADMIN-only recovery path -- ends a shift by unit ID
        rather than requiring the LEAD's own action, for cases where the
        LEAD is unreachable. Always audited. */
    void adminForceEndShift(Long adminId, Long unitId);
}