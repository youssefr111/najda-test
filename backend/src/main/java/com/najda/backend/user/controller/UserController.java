package com.najda.backend.user.controller;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.user.dto.*;
import com.najda.backend.user.model.User;
import com.najda.backend.user.service.UserService;
import com.najda.backend.user.mapper.UserMapper;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {
    
    private final UserService userService;
    private final UserMapper userMapper;

    public UserController(UserService userService, UserMapper userMapper) {
        this.userService = userService;
        this.userMapper = userMapper;
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUsers(role, enabled, search, pageable));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN') or #userId == principal.id")
    @PatchMapping("/{userId}/profile")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long userId,
            @RequestBody UpdateProfileRequest requestBody) {
        try {
            User updated = userService.updateProfile(userId, requestBody);
            return ResponseEntity.ok(userMapper.toResponse(updated));
        } catch (FirebaseAuthException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PatchMapping("/{userId}/facility")
    public ResponseEntity<?> updateFacility(@PathVariable Long userId, @RequestBody Map<String, Long> body) {
        try {
            User updated = userService.updateFacility(userId, body.get("facilityId"));
            return ResponseEntity.ok(userMapper.toResponse(updated));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/me/sync-email")
    public ResponseEntity<?> syncEmail(@AuthenticationPrincipal User user) {
        try {
            UserRecord firebaseUser = FirebaseAuth.getInstance().getUser(user.getFirebaseUid());
            User updated = userService.syncVerifiedEmail(user.getId(), firebaseUser.getEmail());
            return ResponseEntity.ok(userMapper.toResponse(updated));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/{userId}/admin-override-email")
    public ResponseEntity<?> adminOverrideEmail(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        try {
            User updated = userService.adminOverrideEmail(userId, body.get("email"));
            return ResponseEntity.ok(userMapper.toResponse(updated));
        } catch (FirebaseAuthException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/me/phone")
    public ResponseEntity<?> setUnverifiedPhone(@AuthenticationPrincipal User user, @RequestBody Map<String, String> body) {
        User updated = userService.setUnverifiedPhone(user.getId(), body.get("phone"));
        return ResponseEntity.ok(userMapper.toResponse(updated));
    }

    @PostMapping("/me/sync-phone")
    public ResponseEntity<?> syncPhone(HttpServletRequest httpRequest) {
        String verifiedPhone = (String) httpRequest.getAttribute("firebasePhone");
        if (verifiedPhone == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No verified phone number on this token"));
        }
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(userMapper.toResponse(userService.syncVerifiedPhone(user.getId(), verifiedPhone)));
    }
    
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/{userId}/admin-override-phone")
    public ResponseEntity<?> adminOverridePhone(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        try {
            User updated = userService.adminOverridePhone(userId, body.get("phone"));
            return ResponseEntity.ok(userMapper.toResponse(updated));
        } catch (FirebaseAuthException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | ResourceNotFoundException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/{userId}/password-reset-link")
    public ResponseEntity<?> resendPasswordReset(@PathVariable Long userId) {
        return userService.resendPasswordReset(userId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/{userId}/disable")
    public ResponseEntity<?> disableUser(@PathVariable Long userId) {
        return userService.disableUser(userId);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/{userId}/enable")
    public ResponseEntity<?> enableUser(@PathVariable Long userId) {
        return userService.enableUser(userId);
    }
}