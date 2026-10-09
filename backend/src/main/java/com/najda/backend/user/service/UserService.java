package com.najda.backend.user.service;

import com.google.firebase.auth.FirebaseAuthException;
import com.najda.backend.user.dto.*;
import com.najda.backend.user.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserService {
    Page<UserResponse> getAllUsers(String roleName, Boolean enabled, String search, Pageable pageable);
    User updateProfile(Long userId, UpdateProfileRequest request) throws FirebaseAuthException;
    User updateFacility(Long userId, Long facilityId);
    User syncVerifiedEmail(Long userId, String currentFirebaseEmail);
    User adminOverrideEmail(Long userId, String newEmail) throws FirebaseAuthException;
    User setUnverifiedPhone(Long userId, String phone);
    User syncVerifiedPhone(Long userId, String verifiedPhone);
    User adminOverridePhone(Long userId, String newPhone) throws FirebaseAuthException;
    ResponseEntity<?> resendPasswordReset(Long userId);
    ResponseEntity<?> disableUser(Long userId);
    ResponseEntity<?> enableUser(Long userId);
}