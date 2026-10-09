package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.IncidentResponse;
import com.najda.backend.incident.dto.SubmitIncidentRequest;
import com.najda.backend.incident.model.CancellationCategory;
import com.najda.backend.incident.model.FalseReportType;
import java.util.List;

public interface IncidentService {
    List<IncidentResponse> getAll();

    /** Creates the Incident and its initial TEXT-type IncidentMedia entry
        together, in one call -- matches the citizen app's actual flow:
        the text message IS part of submission, not a separate step. */
    IncidentResponse submit(Long citizenId, SubmitIncidentRequest request);

    IncidentResponse updateInjuredCount(Long callerId, Long incidentId, Integer injuredCount);

    /** Citizen-only. Allowed until a unit has arrived on scene. Requires a reason category
        (plus text for OTHER), and stands down any unit that was offered or already heading out. */
    IncidentResponse cancel(Long citizenId, Long incidentId, CancellationCategory category, String details);

    IncidentResponse completeIncident(Long callerId, Long incidentId);

    List<IncidentResponse> getQueue();

    List<IncidentResponse> getActive();

    List<IncidentResponse> getMine(Long citizenId);

    IncidentResponse getById(Long callerId, Long incidentId);

    IncidentResponse markDuplicate(Long callerId, Long incidentId, Long canonicalIncidentId);
    
    /** Dispatcher or admin. Records the incident as a false report (a strike on its caller). If the
    incident is still live and no unit has arrived, also stands its units down and closes it. */
    IncidentResponse markFalseReport(Long callerId, Long incidentId, FalseReportType type);

    /** Admin only. Removes the mark and its strike -- the incident itself stays closed. */
    IncidentResponse clearFalseReport(Long callerId, Long incidentId);
    
    IncidentResponse dismissDuplicateSuggestion(Long callerId, Long incidentId);

    void retryAiPriority(Long incidentId);

    void deleteIncident(Long incidentId);
}