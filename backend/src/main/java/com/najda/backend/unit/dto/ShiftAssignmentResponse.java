package com.najda.backend.unit.dto;

import com.najda.backend.unit.model.RoleInShift;
import java.time.Instant;

public record ShiftAssignmentResponse(
        Long id,
        Long employeeId,
        String employeeName,
        Long unitId,
        String unitPlateNumber,
        RoleInShift roleInShift,
        Instant startTime
) {}