package com.najda.backend.auth.controller;

import com.najda.backend.auth.dto.RegisterCitizenRequest;
import com.najda.backend.auth.dto.RegisterEmployeeRequest;
import com.najda.backend.auth.service.AuthService;
import com.najda.backend.user.model.User;
import com.najda.backend.user.mapper.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.najda.backend.user.service.EmailAvailabilityRateLimiter;
import com.najda.backend.user.repository.UserRepository;
import com.najda.backend.exceptions.ConflictException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserMapper userMapper;
    private final EmailAvailabilityRateLimiter emailAvailabilityRateLimiter;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserMapper userMapper, EmailAvailabilityRateLimiter emailAvailabilityRateLimiter, UserRepository userRepository) {
        this.authService = authService;
        this.userMapper = userMapper;
        this.emailAvailabilityRateLimiter = emailAvailabilityRateLimiter;
        this.userRepository = userRepository;
    }

    /**
     * Called once by the mobile app right after a citizen completes
     * Firebase phone-OTP sign-in. The client already holds a valid Firebase
     * ID token at this point -- this endpoint creates the matching User row.
     */
    @PostMapping("/register/citizen")
    public ResponseEntity<?> registerCitizen(
            @RequestParam(required = false) String provider,
            HttpServletRequest httpRequest,
            @RequestBody RegisterCitizenRequest request) {

        String firebaseUid = (String) httpRequest.getAttribute("firebaseUid");
        if (firebaseUid == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid Firebase token"));
        }
        return authService.registerCitizen(firebaseUid, provider, request);
    }

    /**
     * Admin-provisioned account creation for any non-citizen role
     * (dispatcher, ambulance_crew, firefighter, police, hospital_staff,
     * admin, super_admin). Creates the Firebase account AND the User row.
     */
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/register/employee")
    public ResponseEntity<?> registerEmployee(@RequestBody RegisterEmployeeRequest request) {
        return authService.registerEmployee(request);
    }
    
    @GetMapping("/email-exists")
    public ResponseEntity<?> emailExists(@RequestParam String email, HttpServletRequest request) {
        try {
            emailAvailabilityRateLimiter.checkAllowed(request.getRemoteAddr());
        } catch (ConflictException e) {
            return ResponseEntity.status(429).body(Map.of("error", e.getMessage()));
        }
        return ResponseEntity.ok(Map.of("exists", userRepository.existsByEmailIgnoreCase(email)));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userMapper.toResponse(user));
    }
}