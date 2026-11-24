package com.najda.backend.guidance.service;

import com.najda.backend.guidance.dto.GuidanceResponse;
import com.najda.backend.guidance.dto.UpdateGuidanceRequest;

public interface GuidanceService {

    GuidanceResponse get();

    /**
     * @throws GuidanceValidationException the content is incomplete or malformed
     * @throws com.najda.backend.exceptions.ConflictException someone saved a newer version first
     */
    GuidanceResponse update(Long actorUserId, UpdateGuidanceRequest request);

    /** Stores the starting content, but only when nothing has been saved yet. Used by the startup seeder. */
    void seedIfMissing(com.najda.backend.guidance.dto.GuidanceContent content);
}
