package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.MediaType;
import java.time.LocalDateTime;

public record IncidentMediaResponse(
        Long id, MediaType mediaType, String textContent, LocalDateTime uploadedAt, LocalDateTime updatedAt
) {}