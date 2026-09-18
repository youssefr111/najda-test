package com.najda.backend.unit.repository;

import com.najda.backend.unit.model.RoleInShift;
import com.najda.backend.unit.model.ShiftAssignment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, Long> {

    /** The one query that enforces "a unit can't receive a mission
        without an actively staffed LEAD." */
    Optional<ShiftAssignment> findByUnitIdAndEndTimeIsNullAndRoleInShift(
            Long unitId, RoleInShift roleInShift);

    /** An employee can only ever have one active shift at a time,
        regardless of unit or role. */
    Optional<ShiftAssignment> findByEmployeeIdAndEndTimeIsNull(Long employeeId);

    /** Used when ending a shift -- everyone (LEAD and CREW alike)
        currently active on this unit needs to be closed out together. */
    List<ShiftAssignment> findByUnitIdAndEndTimeIsNull(Long unitId);

    List<ShiftAssignment> findByUnitId(Long unitId);
}