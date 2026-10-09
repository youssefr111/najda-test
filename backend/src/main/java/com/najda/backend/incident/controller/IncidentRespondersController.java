package com.najda.backend.incident.controller;

import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.service.MissionService;
import com.najda.backend.user.model.User;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents/{incidentId}/responders")
public class IncidentRespondersController {

    private final MissionService missionService;

    public IncidentRespondersController(MissionService missionService) {
        this.missionService = missionService;
    }

    @GetMapping
    public ResponseEntity<?> getResponders(@AuthenticationPrincipal User user, @PathVariable Long incidentId) {
        try {
            return ResponseEntity.ok(missionService.getRespondersForIncident(user.getId(), incidentId));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }
}