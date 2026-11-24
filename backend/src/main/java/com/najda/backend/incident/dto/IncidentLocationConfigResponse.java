package com.najda.backend.incident.dto;

import java.util.Map;

public record IncidentLocationConfigResponse(boolean allowManualPin, int manualPinMaxRadiusMeters, Map<String, Object> boundary) {}