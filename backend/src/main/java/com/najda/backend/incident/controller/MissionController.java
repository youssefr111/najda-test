package com.najda.backend.incident.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.AssignUnitMissionRequest;
import com.najda.backend.incident.dto.RejectMissionRequest;
import com.najda.backend.incident.service.MissionService;
import com.najda.backend.user.model.User;
import java.util.Map;
import java.util.function.Supplier;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/missions")
public class MissionController {

    private final MissionService missionService;

    public MissionController(MissionService missionService) {
        this.missionService = missionService;
    }

    @PreAuthorize("hasAnyRole('DISPATCHER','ADMIN','SUPER_ADMIN')")
    @PostMapping("/assign-unit")
    public ResponseEntity<?> assignUnitMission(
            @AuthenticationPrincipal User dispatcher,
            @RequestBody AssignUnitMissionRequest request) {
        return handle(() -> missionService.assignUnitMission(
                dispatcher.getId(), request.incidentId(), request.unitId()));
    }

    @GetMapping
    public ResponseEntity<?> getMissionsForIncident(
            @AuthenticationPrincipal User user, @RequestParam Long incidentId) {
        return handle(() -> missionService.getMissionsForIncident(user.getId(), incidentId));
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMyMissions(@AuthenticationPrincipal User user) {
        return handle(() -> missionService.getMyMissions(user.getId()));
    }

    @PostMapping("/{missionId}/accept")
    public ResponseEntity<?> accept(@AuthenticationPrincipal User user, @PathVariable Long missionId) {
        return handle(() -> missionService.acceptMission(user.getId(), missionId));
    }

    @PostMapping("/{missionId}/reject")
    public ResponseEntity<?> reject(
            @AuthenticationPrincipal User user,
            @PathVariable Long missionId,
            @RequestBody RejectMissionRequest request) {
        return handle(() -> missionService.rejectMission(user.getId(), missionId, request.reason()));
    }

    @PostMapping("/{missionId}/withdraw")
    public ResponseEntity<?> withdrawMission(@AuthenticationPrincipal User user, @PathVariable Long missionId) {
        return handle(() -> missionService.withdrawMission(user.getId(), missionId));
    }

    @PreAuthorize("hasAnyRole('DISPATCHER','ADMIN','SUPER_ADMIN')")
    @PostMapping("/{missionId}/cancel")
    public ResponseEntity<?> cancel(@AuthenticationPrincipal User user, @PathVariable Long missionId) {
        return handle(() -> missionService.cancelMission(user.getId(), missionId));
    }

    @PostMapping("/{missionId}/en-route")
    public ResponseEntity<?> enRoute(@AuthenticationPrincipal User user, @PathVariable Long missionId) {
        return handle(() -> missionService.markEnRoute(user.getId(), missionId));
    }

    @PostMapping("/{missionId}/arrived")
    public ResponseEntity<?> arrived(@AuthenticationPrincipal User user, @PathVariable Long missionId) {
        return handle(() -> missionService.markArrived(user.getId(), missionId));
    }

    @PostMapping("/{missionId}/complete")
    public ResponseEntity<?> complete(@AuthenticationPrincipal User user, @PathVariable Long missionId) {
        return handle(() -> missionService.completeMission(user.getId(), missionId));
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