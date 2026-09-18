package com.najda.backend.unit.dto;

import com.najda.backend.unit.model.UnitStatus;
import com.najda.backend.unit.model.UnitType;

public record ResponseUnitResponse(
        Long id, 
        String plateNumber, 
        UnitType unitType, 
        UnitStatus status,
        Long facilityId, 
        String facilityName,
        Double facilityLatitude,
        Double facilityLongitude,
        Double latitude, 
        Double longitude, 
        String currentLeadName
) {}