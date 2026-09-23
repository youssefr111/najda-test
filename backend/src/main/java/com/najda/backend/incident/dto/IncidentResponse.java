package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.AiPriority;
import com.najda.backend.incident.model.IncidentCategory;
import com.najda.backend.incident.model.IncidentSource;
import com.najda.backend.incident.model.IncidentStatus;
import com.najda.backend.incident.model.LocationSource;

import java.time.LocalDateTime;
import java.util.List;

public record IncidentResponse(
        Long id,
        Long citizenId,
        String citizenName,
        IncidentCategory category,
        Double latitude,
        Double longitude,
        LocationSource locationSource,
        IncidentSource source,
        String address,
        Integer injuredCount,
        IncidentStatus status,
        AiPriority aiPriority,
        Double aiConfidence,
        Long aiSuggestedDuplicateOfId, 
        Double aiDuplicateConfidence,
        List<IncidentMediaResponse> media,
        LocalDateTime createdAt
) {}