package com.najda.backend.hospital.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.hospital.service.HospitalDashboardService;
import com.najda.backend.user.model.User;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/hospital-dashboard")
@PreAuthorize("hasRole('HOSPITAL_STAFF')")
public class HospitalDashboardController {

    private final HospitalDashboardService hospitalDashboardService;

    public HospitalDashboardController(HospitalDashboardService hospitalDashboardService) {
        this.hospitalDashboardService = hospitalDashboardService;
    }

    @GetMapping("/incoming")
    public ResponseEntity<?> getIncoming(@AuthenticationPrincipal User user) {
        try {
            return ResponseEntity.ok(hospitalDashboardService.getIncomingTransfers(user.getId()));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }
}