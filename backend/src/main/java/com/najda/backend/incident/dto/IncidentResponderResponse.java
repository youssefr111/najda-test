package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.unit.model.UnitType;

public record IncidentResponderResponse(
        Long missionId,
        UnitType unitType,
        MissionStatus status,
        Double latitude,
        Double longitude
) {}