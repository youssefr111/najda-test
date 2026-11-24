package com.najda.backend.incident.service;

import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.CallerContactResponse;
import com.najda.backend.incident.model.Incident;
import com.najda.backend.incident.repository.IncidentRepository;
import com.najda.backend.user.model.User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * The caller's phone number for dispatch. A phone number is personal data, so it is not part of the incident
 * response (which also goes to citizens, responders and hospitals): it is read separately, by dispatchers and
 * admins only, and only when the number is verified.
 */
@Service
public class CallerContactServiceImpl implements CallerContactService {

    private final IncidentRepository incidentRepository;

    public CallerContactServiceImpl(IncidentRepository incidentRepository) {
        this.incidentRepository = incidentRepository;
    }

    @Override
    public CallerContactResponse getForIncident(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        return contactOf(incident.getCitizen());
    }

    /** The number is only handed out when it is verified and not blank. */
    public static CallerContactResponse contactOf(User caller) {
        if (caller.isPhoneVerified() && StringUtils.hasText(caller.getPhone())) {
            return new CallerContactResponse(caller.getPhone().strip(), true);
        }
        return new CallerContactResponse(null, false);
    }
}