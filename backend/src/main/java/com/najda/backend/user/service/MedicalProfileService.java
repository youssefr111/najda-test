package com.najda.backend.user.service;

import com.najda.backend.user.dto.MedicalProfileResponse;
import com.najda.backend.user.dto.UpdateMedicalProfileRequest;

public interface MedicalProfileService {
    MedicalProfileResponse getProfile(Long userId);
    MedicalProfileResponse saveProfile(Long userId, UpdateMedicalProfileRequest request);
    void deleteProfile(Long userId);

    /** Whether the user currently allows responders to see their profile during an emergency they report. */
    boolean sharesWithResponders(Long userId);
}