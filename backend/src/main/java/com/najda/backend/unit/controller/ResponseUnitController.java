package com.najda.backend.unit.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.unit.dto.CreateResponseUnitRequest;
import com.najda.backend.unit.dto.UpdateLocationRequest;
import com.najda.backend.unit.dto.UpdateResponseUnitRequest;
import com.najda.backend.unit.service.ResponseUnitService;
import com.najda.backend.unit.service.FacilityManagerService;
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
    private final FacilityManagerService facilityManagerService;

    public ResponseUnitController(ResponseUnitService responseUnitService, FacilityManagerService facilityManagerService) {
        this.responseUnitService = responseUnitService;
        this.facilityManagerService = facilityManagerService;
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

    // Live positions of every unit: staff only (the same roles that may use ShiftController).
    @PreAuthorize("hasAnyRole('DISPATCHER','AMBULANCE_CREW','POLICE','FIREFIGHTER','FIRST_RESPONDER','ADMIN','SUPER_ADMIN')")
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
    
    @PostMapping("/{unitId}/location/reset")
    public ResponseEntity<?> resetLocation(@AuthenticationPrincipal User user, @PathVariable Long unitId) {
        return handle(() -> responseUnitService.resetLocationToFacility(user.getId(), unitId));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/reconcile-statuses")
    public ResponseEntity<?> reconcileStatuses() {
        responseUnitService.reconcileStatuses();
        return ResponseEntity.ok(Map.of("message", "Unit statuses reconciled."));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @GetMapping("/{unitId}/delete-impact")
    public ResponseEntity<?> deleteImpact(@AuthenticationPrincipal User user, @PathVariable Long unitId) {
        return ResponseEntity.ok(facilityManagerService.deleteImpact(user, unitId));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @DeleteMapping("/{unitId}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal User user, @PathVariable Long unitId) {
        try {
            return ResponseEntity.ok(Map.of("outcome", facilityManagerService.deleteUnit(user, unitId)));
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