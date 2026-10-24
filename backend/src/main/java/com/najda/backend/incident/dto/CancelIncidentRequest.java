package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.CancellationCategory;

/** `details` is a short free-text note: optional for every category except OTHER, where it's required. */
public record CancelIncidentRequest(CancellationCategory category, String details) {}