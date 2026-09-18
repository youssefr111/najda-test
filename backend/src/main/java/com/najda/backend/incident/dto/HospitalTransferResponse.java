package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.HospitalTransferStatus;
import com.najda.backend.unit.model.UnitType;

public record HospitalTransferResponse(
        Long id, Long missionId, Long hospitalId, String hospitalName,
        String destinationNameFreetext, HospitalTransferStatus status,
        Double incidentLatitude, Double incidentLongitude,
        UnitType unitType, Double unitLatitude, Double unitLongitude,
        Long unitFacilityId, Double unitFacilityLatitude, Double unitFacilityLongitude
) {}