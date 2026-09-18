package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.MediaType;

public record CreateIncidentMediaRequest(Long incidentId, MediaType mediaType, String path) {}