package com.najda.backend.auth.service;

import com.najda.backend.auth.dto.RegisterCitizenRequest;
import com.najda.backend.auth.dto.RegisterEmployeeRequest;
import org.springframework.http.ResponseEntity;

public interface AuthService {
    ResponseEntity<?> registerCitizen(String firebaseUid, String provider, RegisterCitizenRequest request);
    ResponseEntity<?> registerEmployee(RegisterEmployeeRequest request);
}