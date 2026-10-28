package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.MediaType;
import java.time.Instant;

public record IncidentMediaResponse(
        Long id, MediaType mediaType, String textContent, Instant uploadedAt, Instant updatedAt
) {}