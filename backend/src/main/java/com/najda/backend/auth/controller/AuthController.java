package com.najda.backend.auth.controller;

import com.najda.backend.auth.dto.RegisterCitizenRequest;
import com.najda.backend.auth.dto.RegisterCitizenWithPasswordRequest;
import com.najda.backend.auth.dto.RegisterEmployeeRequest;
import com.najda.backend.auth.dto.SendEmailCodeRequest;
import com.najda.backend.auth.dto.SendEmailCodeResponse;
import com.najda.backend.auth.dto.VerifyEmailCodeRequest;
import com.najda.backend.auth.dto.VerifyEmailCodeResponse;
import com.najda.backend.auth.service.AuthService;
import com.najda.backend.auth.service.EmailVerificationService;
import com.najda.backend.security.ratelimit.InMemoryRateLimiter;
import com.najda.backend.user.mapper.UserMapper;
import com.najda.backend.user.model.User;
import com.najda.backend.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import com.najda.backend.user.dto.UserResponse;
import java.time.Duration;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final InMemoryRateLimiter rateLimiter;
    private final EmailVerificationService emailVerificationService;
    
    @PostMapping("/register/otp/send")
    public SendEmailCodeResponse sendCode(@Valid @RequestBody SendEmailCodeRequest request, HttpServletRequest http) {
        limit("otp-send", http, 10, Duration.ofHours(1));
        return emailVerificationService.sendCode(request.email());
    }

    @PostMapping("/register/otp/verify")
    public VerifyEmailCodeResponse verifyCode(@Valid @RequestBody VerifyEmailCodeRequest request, HttpServletRequest http) {
        limit("otp-verify", http, 30, Duration.ofMinutes(10));
        return emailVerificationService.verifyCode(request.email(), request.code());
    }

    @PostMapping("/register/citizen/password")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterCitizenWithPasswordRequest request, HttpServletRequest http) {
        limit("register", http, 10, Duration.ofHours(1));
        return authService.registerCitizenWithPassword(request);
    }

    private void limit(String action, HttpServletRequest http, int maxRequests, Duration window) {
        rateLimiter.check(action + ":ip:" + http.getRemoteAddr(), maxRequests, window);
    }

    /**
     * Called once by the clients right after a citizen signs in with Google
     * or Firebase phone-OTP. The client already holds a valid Firebase
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
    public Map<String, Boolean> emailExists(@RequestParam String email, HttpServletRequest request) {
        rateLimiter.check("email-exists:ip:" + request.getRemoteAddr(), 8, Duration.ofMinutes(1));
        return Map.of("exists", userRepository.existsByEmailIgnoreCase(email));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userMapper.toResponse(user));
    }
}