package com.najda.backend.unit.controller;

import com.najda.backend.auth.dto.RegisterEmployeeRequest;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.unit.service.FacilityManagerPolicy;
import com.najda.backend.unit.service.FacilityManagerService;
import com.najda.backend.user.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** The facility manager's workspace. Every limit is enforced in {@link FacilityManagerService}, not here. */
@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasRole('FACILITY_MANAGER')")
public class FacilityManagerController {

    public record PlateRequest(@NotBlank @Size(max = 30) String plateNumber) {}

    private final FacilityManagerService service;

    public FacilityManagerController(FacilityManagerService service) {
        this.service = service;
    }

    /** Which facility this manager runs, and what that lets them create. */
    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal User user) {
        Facility facility = service.requireFacility(user);
        return ResponseEntity.ok(Map.of(
                "facilityId", facility.getId(),
                "facilityName", facility.getName(),
                "facilityType", facility.getFacilityType(),
                "unitType", FacilityManagerPolicy.unitTypeFor(facility.getFacilityType()),
                "staffRoles", FacilityManagerPolicy.staffRolesFor(facility.getFacilityType())));
    }

    @GetMapping("/units")
    public ResponseEntity<?> units(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.units(user));
    }

    @PostMapping("/units")
    public ResponseEntity<?> createUnit(@AuthenticationPrincipal User user, @Valid @RequestBody PlateRequest body) {
        return ResponseEntity.status(201).body(service.createUnit(user, body.plateNumber()));
    }

    @PatchMapping("/units/{unitId}")
    public ResponseEntity<?> updateUnit(
            @AuthenticationPrincipal User user, @PathVariable Long unitId, @Valid @RequestBody PlateRequest body) {
        return ResponseEntity.ok(service.updateUnit(user, unitId, body.plateNumber()));
    }

    @GetMapping("/units/{unitId}/delete-impact")
    public ResponseEntity<?> deleteImpact(@AuthenticationPrincipal User user, @PathVariable Long unitId) {
        return ResponseEntity.ok(service.deleteImpact(user, unitId));
    }

    @DeleteMapping("/units/{unitId}")
    public ResponseEntity<?> deleteUnit(@AuthenticationPrincipal User user, @PathVariable Long unitId) {
        return ResponseEntity.ok(Map.of("outcome", service.deleteUnit(user, unitId)));
    }

    @GetMapping("/staff")
    public ResponseEntity<?> staff(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.staff(user));
    }

    @PostMapping("/staff")
    public ResponseEntity<?> createStaff(@AuthenticationPrincipal User user, @Valid @RequestBody RegisterEmployeeRequest body) {
        return service.createStaff(user, body);
    }

    @PostMapping("/staff/{userId}/disable")
    public ResponseEntity<?> disable(@AuthenticationPrincipal User user, @PathVariable Long userId) {
        return service.setStaffEnabled(user, userId, false);
    }

    @PostMapping("/staff/{userId}/enable")
    public ResponseEntity<?> enable(@AuthenticationPrincipal User user, @PathVariable Long userId) {
        return service.setStaffEnabled(user, userId, true);
    }
}
