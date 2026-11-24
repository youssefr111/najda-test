package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.ConsciousnessLevel;

public record VitalsUpdateRequest(
        Long hospitalTransferId,
        Integer heartRate,
        Integer bloodPressureSystolic,
        Integer bloodPressureDiastolic,
        Integer spo2,
        Integer respiratoryRate,
        Double temperatureCelsius,
        ConsciousnessLevel consciousnessLevel,
        String notes
) {}