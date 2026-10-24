package com.najda.backend.incident.controller;

import com.najda.backend.incident.service.CallerHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
public class CallerHistoryController {

    private final CallerHistoryService callerHistoryService;

    public CallerHistoryController(CallerHistoryService callerHistoryService) {
        this.callerHistoryService = callerHistoryService;
    }

    @PreAuthorize("hasAnyRole('DISPATCHER','ADMIN','SUPER_ADMIN')")
    @GetMapping("/api/incidents/{incidentId}/caller-history")
    public ResponseEntity<?> getCallerHistory(@PathVariable Long incidentId) {
        return ResponseEntity.ok(callerHistoryService.getForIncident(incidentId));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @GetMapping("/api/admin/caller-flags")
    public ResponseEntity<?> getFlaggedCallers() {
        return ResponseEntity.ok(callerHistoryService.getFlaggedCallers());
    }
}