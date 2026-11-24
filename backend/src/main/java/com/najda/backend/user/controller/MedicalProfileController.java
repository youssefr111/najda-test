package com.najda.backend.user.controller;

import com.najda.backend.user.dto.MedicalProfileResponse;
import com.najda.backend.user.dto.UpdateMedicalProfileRequest;
import com.najda.backend.user.model.User;
import com.najda.backend.user.service.MedicalProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The caller's own medical profile. There is deliberately no user id in the
 * path -- a user can only ever read, write or delete their own. Responders
 * read it through the incident-scoped endpoint instead.
 */
@RestController
@RequestMapping("/api/users/me/medical-profile")
@RequiredArgsConstructor
public class MedicalProfileController {

    private final MedicalProfileService medicalProfileService;

    @GetMapping
    public MedicalProfileResponse getMyProfile(@AuthenticationPrincipal User user) {
        return medicalProfileService.getProfile(user.getId());
    }

    @PutMapping
    public MedicalProfileResponse saveMyProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateMedicalProfileRequest request) {
        return medicalProfileService.saveProfile(user.getId(), request);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMyProfile(@AuthenticationPrincipal User user) {
        medicalProfileService.deleteProfile(user.getId());
    }
}