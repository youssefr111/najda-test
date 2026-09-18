package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.IncidentResponse;
import com.najda.backend.incident.dto.SubmitIncidentRequest;
import java.util.List;

public interface IncidentService {
    List<IncidentResponse> getAll();

    /** Creates the Incident and its initial TEXT-type IncidentMedia entry
        together, in one call -- matches the citizen app's actual flow:
        the text message IS part of submission, not a separate step. */
    IncidentResponse submit(Long citizenId, SubmitIncidentRequest request);

    IncidentResponse updateInjuredCount(Long callerId, Long incidentId, Integer injuredCount);

    /** State-gated per the original workflow discussion: free before any
        Mission is ACCEPTED, reason-required while EN_ROUTE, blocked
        entirely once one has ARRIVED. */
    IncidentResponse cancel(Long citizenId, Long incidentId, String reason);

    IncidentResponse completeIncident(Long callerId, Long incidentId);

    List<IncidentResponse> getQueue();

    List<IncidentResponse> getActive();

    List<IncidentResponse> getMine(Long citizenId);

    IncidentResponse getById(Long callerId, Long incidentId);

    IncidentResponse markDuplicate(Long callerId, Long incidentId, Long canonicalIncidentId);
    
    IncidentResponse dismissDuplicateSuggestion(Long callerId, Long incidentId);

    void retryAiPriority(Long incidentId);

    void deleteIncident(Long incidentId);
}