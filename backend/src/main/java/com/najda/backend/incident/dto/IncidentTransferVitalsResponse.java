package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.HospitalTransferStatus;
import java.util.List;

/** One ambulance's patient transfer on an incident, with every vitals reading its crew has sent (newest first). */
public record IncidentTransferVitalsResponse(
        Long hospitalTransferId,
        String destinationName,
        String unitPlateNumber,
        HospitalTransferStatus status,
        List<VitalsUpdateResponse> updates
) {}
