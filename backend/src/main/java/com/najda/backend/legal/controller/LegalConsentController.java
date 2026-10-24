package com.najda.backend.legal.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.legal.dto.AcceptConsentRequest;
import com.najda.backend.legal.dto.ConsentStatusResponse;
import com.najda.backend.legal.service.LegalConsentService;
import com.najda.backend.user.model.User;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** What the signed-in person still has to accept, and recording that they did. */
@RestController
@RequestMapping("/api/legal/consent")
public class LegalConsentController {

    private final LegalConsentService consentService;

    public LegalConsentController(LegalConsentService consentService) {
        this.consentService = consentService;
    }

    @GetMapping
    public ConsentStatusResponse status(@AuthenticationPrincipal User user) {
        return consentService.status(user.getId());
    }

    @PostMapping
    public ResponseEntity<?> accept(@AuthenticationPrincipal User user, @Valid @RequestBody AcceptConsentRequest request) {
        try {
            return ResponseEntity.ok(consentService.accept(user.getId(), request));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }
}
