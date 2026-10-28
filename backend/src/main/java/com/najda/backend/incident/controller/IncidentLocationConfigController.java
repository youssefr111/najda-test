package com.najda.backend.incident.controller;

import com.najda.backend.incident.dto.IncidentLocationConfigResponse;
import com.najda.backend.incident.service.IncidentLocationPolicy;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/config/incident-location")
public class IncidentLocationConfigController {

    private final IncidentLocationPolicy policy;

    public IncidentLocationConfigController(IncidentLocationPolicy policy) {
        this.policy = policy;
    }

    @GetMapping
    public IncidentLocationConfigResponse get() {
        return new IncidentLocationConfigResponse(
                policy.allowManualPin(), policy.manualPinMaxRadiusMeters(), policy.egyptBoundary().geometry());
    }
}