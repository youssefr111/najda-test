package com.najda.backend.unit.dto;

import com.najda.backend.unit.model.UnitType;

public record CreateResponseUnitRequest(
        String plateNumber,
        UnitType unitType,
        Long facilityId
) {}