package com.najda.backend.user.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.user.dto.*;
import com.najda.backend.user.model.User;
import com.najda.backend.user.service.FirstResponderApplicationService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/first-responder-applications")
public class FirstResponderApplicationController {

    private final FirstResponderApplicationService service;

    public FirstResponderApplicationController(FirstResponderApplicationService service) {
        this.service = service;
    }

    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submit(
            @AuthenticationPrincipal User user,
            @RequestParam String motivation,
            @RequestParam("files") java.util.List<org.springframework.web.multipart.MultipartFile> files) {
        try {
            return ResponseEntity.status(201).body(service.submit(user.getId(), motivation, files));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Submission failed: " + e.getMessage()));
        }
    }

    @PostMapping("/upload-url")
    public ResponseEntity<?> getUploadUrl(@AuthenticationPrincipal User user, @RequestParam Long applicationId, @RequestParam String fileExtension) {
        try {
            var signed = service.createUploadUrl(user.getId(), applicationId, fileExtension);
            return ResponseEntity.ok(Map.of("uploadUrl", signed.uploadUrl(), "path", signed.path()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Could not reach storage provider: " + e.getMessage()));
        }
    }

    @PostMapping("/documents")
    public ResponseEntity<?> addDocument(@AuthenticationPrincipal User user, @RequestBody CreateApplicationDocumentRequest request) {
        try {
            return ResponseEntity.status(201).body(service.addDocument(user.getId(), request));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Registration failed: " + e.getMessage()));
        }
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMine(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.getMine(user.getId()));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @GetMapping
    public ResponseEntity<?> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.getAll(user.getId()));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/{applicationId}/approve")
    public ResponseEntity<?> approve(@AuthenticationPrincipal User user, @PathVariable Long applicationId) {
        try {
            return ResponseEntity.ok(service.approve(user.getId(), applicationId));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/{applicationId}/reject")
    public ResponseEntity<?> reject(@AuthenticationPrincipal User user, @PathVariable Long applicationId, @RequestBody RejectApplicationRequest request) {
        try {
            return ResponseEntity.ok(service.reject(user.getId(), applicationId, request.reason()));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<?> deleteDocument(@AuthenticationPrincipal User user, @PathVariable Long documentId) {
        try {
            service.deleteDocument(user.getId(), documentId);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Could not remove file from storage provider"));
        }
    }

    @GetMapping("/documents/{documentId}/download-url")
    public ResponseEntity<?> getDocumentDownloadUrl(@AuthenticationPrincipal User user, @PathVariable Long documentId) {
        try {
            return ResponseEntity.ok(Map.of("downloadUrl", service.getDocumentDownloadUrl(user.getId(), documentId)));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Could not reach storage provider"));
        }
    }
}