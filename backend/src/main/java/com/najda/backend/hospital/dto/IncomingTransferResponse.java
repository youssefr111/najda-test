package com.najda.backend.hospital.dto;

import com.najda.backend.incident.model.HospitalTransferStatus;
import com.najda.backend.unit.model.UnitType;

public record IncomingTransferResponse(
        Long id, Long missionId, Long incidentId, HospitalTransferStatus status,
        UnitType unitType, Double unitLatitude, Double unitLongitude,
        Double unitFacilityLatitude, Double unitFacilityLongitude
) {}