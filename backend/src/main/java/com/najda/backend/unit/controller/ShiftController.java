package com.najda.backend.unit.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.unit.dto.JoinShiftRequest;
import com.najda.backend.unit.dto.StartShiftRequest;
import com.najda.backend.unit.service.ShiftService;
import com.najda.backend.user.model.User;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shifts")
@PreAuthorize("hasAnyRole('DISPATCHER','AMBULANCE_CREW','POLICE','FIREFIGHTER','FIRST_RESPONDER','ADMIN','SUPER_ADMIN')")
public class ShiftController {

    private final ShiftService shiftService;

    public ShiftController(ShiftService shiftService) {
        this.shiftService = shiftService;
    }

    @PostMapping("/start")
    public ResponseEntity<?> startShift(
            @AuthenticationPrincipal User user,
            @RequestBody StartShiftRequest request) {
        try {
            return ResponseEntity.ok(shiftService.startShift(user.getId(), request.unitId()));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinShift(
            @AuthenticationPrincipal User user,
            @RequestBody JoinShiftRequest request) {
        try {
            return ResponseEntity.ok(shiftService.joinShift(user.getId(), request.unitId()));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyShift(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(shiftService.getMyShift(user.getId()));
    }

    @GetMapping("/unit/{unitId}/crew")
    public ResponseEntity<?> getCrewForUnit(@PathVariable Long unitId) {
        return ResponseEntity.ok(shiftService.getCrewForUnit(unitId));
    }
    
    @PostMapping("/leave")
    public ResponseEntity<?> leaveShift(@AuthenticationPrincipal User user) {
        try {
            shiftService.leaveShift(user.getId());
            return ResponseEntity.ok(Map.of("message", "Left shift"));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/end")
    public ResponseEntity<?> endShift(@AuthenticationPrincipal User user) {
        try {
            shiftService.endShift(user.getId());
            return ResponseEntity.ok(Map.of("message", "Shift ended"));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/admin-force-end/{unitId}")
    public ResponseEntity<?> adminForceEndShift(
            @AuthenticationPrincipal User admin,
            @PathVariable Long unitId) {
        try {
            shiftService.adminForceEndShift(admin.getId(), unitId);
            return ResponseEntity.ok(Map.of("message", "Shift force-ended"));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }
}