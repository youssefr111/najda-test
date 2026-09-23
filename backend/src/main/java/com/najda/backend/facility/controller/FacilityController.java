package com.najda.backend.facility.controller;

import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.facility.dto.CreateFacilityRequest;
import com.najda.backend.facility.dto.UpdateFacilityRequest;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.service.FacilityService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/facilities")
public class FacilityController {

    private final FacilityService facilityService;

    public FacilityController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateFacilityRequest request) {
        return ResponseEntity.status(201).body(facilityService.create(request));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PatchMapping("/{facilityId}")
    public ResponseEntity<?> update(@PathVariable Long facilityId, @RequestBody UpdateFacilityRequest request) {
        try {
            return ResponseEntity.ok(facilityService.update(facilityId, request));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAll(@RequestParam(required = false) FacilityType type) {
        return ResponseEntity.ok(type != null ? facilityService.getByType(type) : facilityService.getAll());
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/backfill-addresses")
    public ResponseEntity<?> backfillAddresses() {
        facilityService.backfillMissingAddresses();
        return ResponseEntity.accepted().body(Map.of("message", "Backfilling addresses -- check logs for progress."));
    }
}