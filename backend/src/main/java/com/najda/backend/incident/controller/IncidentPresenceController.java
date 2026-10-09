package com.najda.backend.incident.controller;

import com.najda.backend.incident.dto.IncidentViewerResponse;
import com.najda.backend.incident.service.IncidentPresenceService;
import com.najda.backend.user.model.User;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents/{incidentId}/presence")
@PreAuthorize("hasAnyRole('DISPATCHER','ADMIN','SUPER_ADMIN')")
public class IncidentPresenceController {

    private final IncidentPresenceService presenceService;

    public IncidentPresenceController(IncidentPresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @PutMapping
    public List<IncidentViewerResponse> heartbeat(@AuthenticationPrincipal User user, @PathVariable Long incidentId) {
        return presenceService.heartbeat(incidentId, user);
    }

    @GetMapping
    public List<IncidentViewerResponse> viewers(@AuthenticationPrincipal User user, @PathVariable Long incidentId) {
        return presenceService.viewersExcluding(incidentId, user.getId());
    }

    @DeleteMapping
    public ResponseEntity<Void> leave(@AuthenticationPrincipal User user, @PathVariable Long incidentId) {
        presenceService.leave(incidentId, user.getId());
        return ResponseEntity.noContent().build();
    }
}