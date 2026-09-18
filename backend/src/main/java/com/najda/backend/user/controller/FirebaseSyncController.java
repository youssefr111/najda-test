package com.najda.backend.user.controller;

import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.user.service.FirebaseSyncService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/firebase-sync")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class FirebaseSyncController {

    private final FirebaseSyncService firebaseSyncService;

    public FirebaseSyncController(FirebaseSyncService firebaseSyncService) {
        this.firebaseSyncService = firebaseSyncService;
    }

    @GetMapping("/report")
    public ResponseEntity<?> report() {
        try {
            return ResponseEntity.ok(firebaseSyncService.buildReport());
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Could not reach Firebase: " + e.getMessage()));
        }
    }

    @PostMapping("/sync-user/{uid}")
    public ResponseEntity<?> syncUser(@PathVariable String uid) {
        try {
            return ResponseEntity.status(201).body(firebaseSyncService.syncFirebaseUser(uid));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/firebase-user/{uid}")
    public ResponseEntity<?> deleteFirebaseUser(@PathVariable String uid) {
        try {
            firebaseSyncService.deleteOrphanedFirebaseUser(uid);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/postgres-user/{userId}")
    public ResponseEntity<?> deletePostgresUser(@PathVariable Long userId) {
        try {
            firebaseSyncService.deleteOrphanedPostgresUser(userId);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }
}