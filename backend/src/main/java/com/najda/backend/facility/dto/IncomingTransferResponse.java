package com.najda.backend.facility.dto;

import com.najda.backend.incident.model.HospitalTransferStatus;

public record IncomingTransferResponse(
        Long hospitalTransferId,
        Long missionId,
        Long incidentId,
        HospitalTransferStatus status
) {}