package com.najda.backend.auth.service;

import com.najda.backend.auth.dto.RegisterCitizenRequest;
import com.najda.backend.auth.dto.RegisterCitizenWithPasswordRequest;
import com.najda.backend.auth.dto.RegisterEmployeeRequest;
import com.najda.backend.user.dto.UserResponse;
import org.springframework.http.ResponseEntity;

public interface AuthService {

    /** Bootstrap for an already-authenticated Firebase identity (Google / phone sign-in). */
    ResponseEntity<?> registerCitizen(String firebaseUid, String provider, RegisterCitizenRequest request);

    /** Email + password registration; requires a prior successful OTP verification of the email. */
    UserResponse registerCitizenWithPassword(RegisterCitizenWithPasswordRequest request);

    ResponseEntity<?> registerEmployee(RegisterEmployeeRequest request);
}