package com.najda.backend.guidance.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.guidance.dto.GuidanceResponse;
import com.najda.backend.guidance.dto.UpdateGuidanceRequest;
import com.najda.backend.guidance.service.GuidanceService;
import com.najda.backend.guidance.service.GuidanceValidationException;
import com.najda.backend.user.model.User;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Safety guidance shown to citizens while a report is active. One source for web and mobile. */
@RestController
@RequestMapping("/api/guidance")
public class GuidanceController {

    private final GuidanceService guidanceService;

    public GuidanceController(GuidanceService guidanceService) {
        this.guidanceService = guidanceService;
    }

    /** Any signed-in user: citizens read it, admins load it into the editor. */
    @GetMapping
    public GuidanceResponse get() {
        return guidanceService.get();
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PutMapping
    public ResponseEntity<?> update(@AuthenticationPrincipal User user,
                                    @Valid @RequestBody UpdateGuidanceRequest request) {
        try {
            return ResponseEntity.ok(guidanceService.update(user.getId(), request));
        } catch (GuidanceValidationException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }
}
