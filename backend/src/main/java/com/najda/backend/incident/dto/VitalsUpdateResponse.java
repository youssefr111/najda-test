package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.ConsciousnessLevel;
import java.time.Instant;

public record VitalsUpdateResponse(
        Long id,
        Integer heartRate,
        Integer bloodPressureSystolic,
        Integer bloodPressureDiastolic,
        Integer spo2,
        Integer respiratoryRate,
        Double temperatureCelsius,
        ConsciousnessLevel consciousnessLevel,
        String notes,
        Instant recordedAt
) {}