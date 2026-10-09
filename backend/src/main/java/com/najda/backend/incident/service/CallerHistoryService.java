package com.najda.backend.incident.service;

import com.najda.backend.incident.dto.CallerHistoryResponse;
import com.najda.backend.incident.dto.FlaggedCallerResponse;
import java.util.List;

public interface CallerHistoryService {

    /** Context for a dispatcher or admin: how this incident's caller has behaved recently,
        not counting this incident. Informational only -- never an input to priority or assignment. */
    CallerHistoryResponse getForIncident(Long incidentId);

    /** Admin review list: callers who cancelled after units were dispatched often enough to warrant a look. */
    List<FlaggedCallerResponse> getFlaggedCallers();
}