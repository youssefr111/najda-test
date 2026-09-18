package com.najda.backend.unit.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.unit.dto.CreateResponseUnitRequest;
import com.najda.backend.unit.dto.UpdateLocationRequest;
import com.najda.backend.unit.dto.UpdateResponseUnitRequest;
import com.najda.backend.unit.service.ResponseUnitService;
import com.najda.backend.user.model.User;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/units")
public class ResponseUnitController {

    private final ResponseUnitService responseUnitService;

    public ResponseUnitController(ResponseUnitService responseUnitService) {
        this.responseUnitService = responseUnitService;
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateResponseUnitRequest request) {
        try {
            return ResponseEntity.status(201).body(responseUnitService.create(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(responseUnitService.getAll());
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMyFacilityUnits(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(responseUnitService.getUnitsForFacility(user.getFacility() != null ? user.getFacility().getId() : null, user.getRole().getRoleName(), user.getId()));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PatchMapping("/{unitId}")
    public ResponseEntity<?> update(@PathVariable Long unitId, @RequestBody UpdateResponseUnitRequest request) {
        try {
            return ResponseEntity.ok(responseUnitService.update(unitId, request));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{unitId}/location")
    public ResponseEntity<?> updateLocation(@AuthenticationPrincipal User user, @PathVariable Long unitId, @RequestBody UpdateLocationRequest request) {
        return handle(() -> responseUnitService.updateLocation(user.getId(), unitId, request.latitude(), request.longitude()));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/reconcile-statuses")
    public ResponseEntity<?> reconcileStatuses() {
        responseUnitService.reconcileStatuses();
        return ResponseEntity.ok(Map.of("message", "Unit statuses reconciled."));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @DeleteMapping("/{unitId}")
    public ResponseEntity<?> delete(@PathVariable Long unitId) {
        try {
            responseUnitService.delete(unitId);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
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