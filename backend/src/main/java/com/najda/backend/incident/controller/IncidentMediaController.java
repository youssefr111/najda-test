package com.najda.backend.incident.controller;

import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.incident.dto.CreateIncidentMediaRequest;
import com.najda.backend.incident.dto.EditTextMessageRequest;
import com.najda.backend.incident.dto.IncidentMediaResponse;
import com.najda.backend.incident.dto.SupabaseUploadUrlResponse;
import com.najda.backend.incident.model.IncidentMedia;
import com.najda.backend.incident.service.IncidentMediaService;
import com.najda.backend.user.model.User;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incident-media")
public class IncidentMediaController {

    private final IncidentMediaService incidentMediaService;

    public IncidentMediaController(IncidentMediaService incidentMediaService) {
        this.incidentMediaService = incidentMediaService;
    }

    @PostMapping("/upload-url")
    public ResponseEntity<?> getUploadUrl(
            @AuthenticationPrincipal User user,
            @RequestParam Long incidentId,
            @RequestParam String fileExtension) {
        try {
            var signed = incidentMediaService.createUploadUrl(user.getId(), incidentId, fileExtension);
            return ResponseEntity.ok(new SupabaseUploadUrlResponse(signed.uploadUrl(), signed.path()));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Could not reach storage provider: " + e.getMessage()));
        }
    }

    @PostMapping(consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> registerMedia(
            @AuthenticationPrincipal User user,
            @RequestBody CreateIncidentMediaRequest request) {
        try {
            IncidentMedia saved = incidentMediaService.createMedia(user.getId(), request);
            return ResponseEntity.status(201).body(new IncidentMediaResponse(
                    saved.getId(), saved.getMediaType(), null, saved.getUploadedAt(), saved.getUpdatedAt()));
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

    @GetMapping("/{mediaId}/download-url")
    public ResponseEntity<?> getDownloadUrl(@AuthenticationPrincipal User user, @PathVariable Long mediaId) {
        try {
            return ResponseEntity.ok(Map.of("downloadUrl", incidentMediaService.getDownloadUrl(user.getId(), mediaId)));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Could not reach storage provider"));
        }
    }

    @PatchMapping("/{mediaId}/text")
    public ResponseEntity<?> editTextMessage(
            @AuthenticationPrincipal User user,
            @PathVariable Long mediaId,
            @RequestBody EditTextMessageRequest request) {
        try {
            return ResponseEntity.ok(incidentMediaService.editTextMessage(user.getId(), mediaId, request.textContent()));
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{mediaId}")
    public ResponseEntity<?> deleteMedia(@AuthenticationPrincipal User user, @PathVariable Long mediaId) {
        try {
            incidentMediaService.deleteMedia(user.getId(), mediaId);
            return ResponseEntity.noContent().build();
        } catch (ConflictException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Could not remove file from storage provider"));
        }
    }
}