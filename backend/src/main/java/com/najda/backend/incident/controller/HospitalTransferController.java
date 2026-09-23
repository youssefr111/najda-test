package com.najda.backend.incident.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.SelectHospitalRequest;
import com.najda.backend.incident.dto.VitalsUpdateRequest;
import com.najda.backend.incident.service.HospitalTransferService;
import com.najda.backend.user.model.User;
import java.util.Map;
import java.util.function.Supplier;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hospital-transfers")
public class HospitalTransferController {

    private final HospitalTransferService hospitalTransferService;

    public HospitalTransferController(HospitalTransferService hospitalTransferService) {
        this.hospitalTransferService = hospitalTransferService;
    }

    @GetMapping("/recommended/{missionId}")
    public ResponseEntity<?> getRecommendedHospitals(
            @AuthenticationPrincipal User user, @PathVariable Long missionId) {
        return handle(() -> hospitalTransferService.getRecommendedHospitals(user.getId(), missionId));
    }

    @GetMapping
    public ResponseEntity<?> getForHospital(@AuthenticationPrincipal User user, @RequestParam Long hospitalId) {
        return handle(() -> hospitalTransferService.getForHospital(user.getId(), hospitalId));
    }

    @PostMapping("/select")
    public ResponseEntity<?> selectHospital(
            @AuthenticationPrincipal User user, @RequestBody SelectHospitalRequest request) {
        return handle(() -> hospitalTransferService.selectHospital(
                user.getId(), request.missionId(), request.hospitalId(), request.destinationNameFreetext()));
    }

    @PostMapping("/{hospitalTransferId}/en-route")
    public ResponseEntity<?> markEnRoute(
            @AuthenticationPrincipal User user, @PathVariable Long hospitalTransferId) {
        return handle(() -> hospitalTransferService.markEnRoute(user.getId(), hospitalTransferId));
    }

    @PostMapping("/{hospitalTransferId}/arrived")
    public ResponseEntity<?> markArrived(
            @AuthenticationPrincipal User user, @PathVariable Long hospitalTransferId) {
        return handle(() -> hospitalTransferService.markArrived(user.getId(), hospitalTransferId));
    }

    @PostMapping("/vitals")
    public ResponseEntity<?> sendVitals(
            @AuthenticationPrincipal User user, @RequestBody VitalsUpdateRequest request) {
        return handle(() -> {
            hospitalTransferService.sendVitalsUpdate(user.getId(), request);
            return Map.of("message", "Vitals sent");
        });
    }

    @GetMapping("/{hospitalTransferId}/vitals")
    public ResponseEntity<?> getVitalsHistory(
            @AuthenticationPrincipal User user, @PathVariable Long hospitalTransferId) {
        return handle(() -> hospitalTransferService.getVitalsHistory(user.getId(), hospitalTransferId));
    }

    @GetMapping("/mission/{missionId}")
    public ResponseEntity<?> getForMission(@AuthenticationPrincipal User user, @PathVariable Long missionId) {
        return handle(() -> hospitalTransferService.getForMission(user.getId(), missionId));
    }

    private ResponseEntity<?> handle(Supplier<Object> action) {
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