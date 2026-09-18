package com.najda.backend.incident.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.CancelIncidentRequest;
import com.najda.backend.incident.dto.SubmitIncidentRequest;
import com.najda.backend.incident.dto.UpdateInjuredCountRequest;
import com.najda.backend.incident.service.*;
import com.najda.backend.user.model.User;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(incidentService.getAll());
    }

    // @PreAuthorize("hasRole('CITIZEN')")
    @PostMapping
    public ResponseEntity<?> submit(
            @AuthenticationPrincipal User citizen, @RequestBody SubmitIncidentRequest request) {
        return ResponseEntity.status(201).body(incidentService.submit(citizen.getId(), request));
    }

    @PatchMapping("/{incidentId}/injured-count")
    public ResponseEntity<?> updateInjuredCount(@AuthenticationPrincipal User user, @PathVariable Long incidentId, @RequestBody UpdateInjuredCountRequest request) {
        return handle(() -> incidentService.updateInjuredCount(user.getId(), incidentId, request.injuredCount()));
    }

    @PostMapping("/{incidentId}/cancel")
    public ResponseEntity<?> cancel(
            @AuthenticationPrincipal User citizen,
            @PathVariable Long incidentId,
            @RequestBody CancelIncidentRequest request) {
        return handle(() -> incidentService.cancel(citizen.getId(), incidentId, request.reason()));
    }

    @PostMapping("/{incidentId}/complete")
    public ResponseEntity<?> completeIncident(@AuthenticationPrincipal User user, @PathVariable Long incidentId) {
        return handle(() -> incidentService.completeIncident(user.getId(), incidentId));
    }

    @PreAuthorize("hasAnyRole('DISPATCHER','ADMIN','SUPER_ADMIN')")
    @GetMapping("/queue")
    public ResponseEntity<?> getQueue() {
        return ResponseEntity.ok(incidentService.getQueue());
    }

    @PreAuthorize("hasAnyRole('DISPATCHER','ADMIN','SUPER_ADMIN')")
    @GetMapping("/active")
    public ResponseEntity<?> getActive() {
        return ResponseEntity.ok(incidentService.getActive());
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMine(@AuthenticationPrincipal User citizen) {
        return ResponseEntity.ok(incidentService.getMine(citizen.getId()));
    }

    @GetMapping("/{incidentId}")
    public ResponseEntity<?> getById(
            @AuthenticationPrincipal User user, @PathVariable Long incidentId) {
        return handle(() -> incidentService.getById(user.getId(), incidentId));
    }

    @PreAuthorize("hasAnyRole('DISPATCHER','ADMIN','SUPER_ADMIN')")
    @PostMapping("/{incidentId}/mark-duplicate")
    public ResponseEntity<?> markDuplicate(@AuthenticationPrincipal User user, @PathVariable Long incidentId, @RequestBody Map<String, Long> body) {
        return handle(() -> incidentService.markDuplicate(user.getId(), incidentId, body.get("canonicalIncidentId")));
    }

    @PostMapping("/{incidentId}/dismiss-duplicate-suggestion")
    public ResponseEntity<?> dismissDuplicateSuggestion(@AuthenticationPrincipal User user, @PathVariable Long incidentId) {
        return handle(() -> incidentService.dismissDuplicateSuggestion(user.getId(), incidentId));
    }

    @PreAuthorize("hasAnyRole('DISPATCHER','ADMIN','SUPER_ADMIN')")
    @PostMapping("/{incidentId}/retry-ai-priority")
    public ResponseEntity<?> retryAiPriority(@PathVariable Long incidentId) {
        return handle(() -> { incidentService.retryAiPriority(incidentId); return Map.of("message", "Retrying classification."); });
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @DeleteMapping("/{incidentId}")
    public ResponseEntity<?> delete(@PathVariable Long incidentId) {
        try {
            incidentService.deleteIncident(incidentId);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    private ResponseEntity<?> handle(java.util.function.Supplier<Object> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }
}