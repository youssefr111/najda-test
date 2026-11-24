package com.najda.backend.incident.controller;

import com.najda.backend.incident.service.CallerContactService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CallerContactController {

    private final CallerContactService callerContactService;

    public CallerContactController(CallerContactService callerContactService) {
        this.callerContactService = callerContactService;
    }

    @PreAuthorize("hasAnyRole('DISPATCHER','ADMIN','SUPER_ADMIN')")
    @GetMapping("/api/incidents/{incidentId}/caller-contact")
    public ResponseEntity<?> getCallerContact(@PathVariable Long incidentId) {
        return ResponseEntity.ok(callerContactService.getForIncident(incidentId));
    }
}