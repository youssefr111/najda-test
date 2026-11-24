package com.najda.backend.legal.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.legal.dto.LegalDocumentResponse;
import com.najda.backend.legal.dto.LegalVersionSummary;
import com.najda.backend.legal.dto.PublishLegalRequest;
import com.najda.backend.legal.model.LegalDocumentType;
import com.najda.backend.legal.service.LegalDocumentService;
import com.najda.backend.legal.service.LegalValidationException;
import com.najda.backend.user.model.User;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The Terms & Conditions and Privacy Policy. Reading the current one is public; editing is SUPER_ADMIN only. */
@RestController
@RequestMapping("/api/legal/documents")
public class LegalDocumentController {

    private final LegalDocumentService documents;

    public LegalDocumentController(LegalDocumentService documents) {
        this.documents = documents;
    }

    /** Public: visitors read the policy before they even have an account. {@code type} is {@code terms} or {@code privacy}. */
    @GetMapping("/{type}")
    public LegalDocumentResponse latest(@PathVariable String type) {
        return documents.getLatest(LegalDocumentType.fromSlug(type));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @GetMapping("/{type}/versions")
    public List<LegalVersionSummary> versions(@PathVariable String type) {
        return documents.listVersions(LegalDocumentType.fromSlug(type));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @GetMapping("/{type}/versions/{version}")
    public LegalDocumentResponse version(@PathVariable String type, @PathVariable int version) {
        return documents.getVersion(LegalDocumentType.fromSlug(type), version);
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/{type}/versions")
    public ResponseEntity<?> publish(@AuthenticationPrincipal User user, @PathVariable String type,
                                     @Valid @RequestBody PublishLegalRequest request) {
        try {
            return ResponseEntity.status(201)
                    .body(documents.publish(user.getId(), LegalDocumentType.fromSlug(type), request));
        } catch (LegalValidationException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }
}
