package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.CallerContactResponse;

public interface CallerContactService {

    /** How a dispatcher or admin can reach this incident's caller: their phone number, but only when it is verified. */
    CallerContactResponse getForIncident(Long incidentId);
}