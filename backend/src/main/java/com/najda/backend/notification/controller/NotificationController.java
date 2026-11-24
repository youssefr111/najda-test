package com.najda.backend.notification.controller;

import com.najda.backend.notification.dto.NotificationDtos.NotificationPage;
import com.najda.backend.notification.dto.NotificationDtos.RegisterDeviceRequest;
import com.najda.backend.notification.dto.NotificationDtos.UnreadCountResponse;
import com.najda.backend.notification.service.NotificationService;
import com.najda.backend.user.model.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** The signed-in user's notification inbox and push devices. Every user, every role. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    /** Newest first. {@code before} = the id of the last item already shown. */
    @GetMapping
    public NotificationPage list(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "30") int limit) {
        return service.list(user.getId(), before, limit);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal User user) {
        return new UnreadCountResponse(service.unreadCount(user.getId()));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@AuthenticationPrincipal User user, @PathVariable Long id) {
        service.markRead(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal User user) {
        service.markAllRead(user.getId());
        return ResponseEntity.noContent().build();
    }

    /** Registers this device (Android / iOS / browser) for push. Idempotent: safe to call on every launch. */
    @PostMapping("/devices")
    public ResponseEntity<Void> registerDevice(
            @AuthenticationPrincipal User user, @Valid @RequestBody RegisterDeviceRequest request) {
        service.registerDevice(user.getId(), request);
        return ResponseEntity.noContent().build();
    }

    /** Stops push to this device (sign-out, or the user switched push off). */
    @DeleteMapping("/devices")
    public ResponseEntity<Void> unregisterDevice(@AuthenticationPrincipal User user, @RequestParam String token) {
        service.unregisterDevice(user.getId(), token);
        return ResponseEntity.noContent().build();
    }
}
