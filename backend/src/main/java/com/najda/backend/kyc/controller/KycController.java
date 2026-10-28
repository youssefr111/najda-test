package com.najda.backend.kyc.controller;

import com.najda.backend.kyc.dto.AdminKycRequest;
import com.najda.backend.kyc.dto.KycStatusResponse;
import com.najda.backend.kyc.service.KycService;
import com.najda.backend.user.model.User;
import com.najda.backend.legal.web.RequiresLegalConsent;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kyc")
public class KycController {

    private final KycService kycService;

    public KycController(KycService kycService) {
        this.kycService = kycService;
    }

    /** The caller's own verification status (and whether it is required of them). */
    @GetMapping("/status")
    public KycStatusResponse status(@AuthenticationPrincipal User user) {
        return kycService.statusRefreshed(user);
    }

    /** Starts (or restarts) verification: returns the hosted page to open. */
    @RequiresLegalConsent
    @PostMapping("/session")
    public Map<String, Object> start(@AuthenticationPrincipal User user) {
        KycService.StartResult result = kycService.start(user.getId());
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("url", result.url()); // null when they are already verified: nothing to open
        body.put("status", result.status());
        return body;
    }

    /**
     * Didit's webhook. PUBLIC at the security level (Didit sends no bearer token): it is authenticated by the HMAC
     * signature of the raw body, checked before anything is parsed. A bad signature is a 401; everything else is a
     * 200 (so a delivery we chose to ignore is not retried); a provider failure bubbles up as a 5xx so Didit retries.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(
            @RequestBody byte[] body,
            @RequestHeader(value = "X-Signature", required = false) String signature,
            @RequestHeader(value = "X-Timestamp", required = false) String timestamp) {
        return switch (kycService.handleWebhook(body, signature, timestamp)) {
            case BAD_SIGNATURE -> ResponseEntity.status(401).body(Map.of("error", "Invalid signature"));
            case PROCESSED, IGNORED -> ResponseEntity.ok(Map.of("ok", true));
        };
    }

    /** Test / support tool: set someone's status by hand (audited). */
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    @PostMapping("/admin/{userId}/status")
    public KycStatusResponse adminSet(
            @AuthenticationPrincipal User admin, @PathVariable Long userId, @Valid @RequestBody AdminKycRequest body) {
        return kycService.adminSetStatus(admin, userId, body.status(), body.note());
    }
}
