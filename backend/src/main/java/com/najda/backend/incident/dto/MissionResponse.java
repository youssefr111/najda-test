package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.MissionStatus;
import com.najda.backend.unit.model.UnitType;
import java.time.LocalDateTime;
import java.util.List;

public record MissionResponse(
        Long id,
        Long incidentId,
        UnitType unitType,
        Long unitId,
        String unitPlateNumber,
        MissionStatus status,
        List<String> participantNames,
        LocalDateTime offeredAt,
        LocalDateTime acceptedAt,
        LocalDateTime arrivedAt,
        LocalDateTime completedAt
) {}