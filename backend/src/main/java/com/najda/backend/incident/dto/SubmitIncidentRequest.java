package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.IncidentCategory;
import com.najda.backend.incident.model.LocationSource;

public record SubmitIncidentRequest(
        IncidentCategory category,
        String textMessage,
        Double latitude,
        Double longitude,
        LocationSource locationSource,
        Integer injuredCount
) {}