package com.najda.backend.kyc.dto;

import com.najda.backend.kyc.model.KycStatus;
import java.time.Instant;

/**
 * @param required  whether verification is REQUIRED OF THIS PERSON to report (the switch is on, they are not exempt
 *                  and not grandfathered). When false they may still verify; they are just not blocked.
 * @param providerConfigured false when the server has no Didit credentials (the Start button should say so).
 */
public record KycStatusResponse(
        KycStatus status,
        boolean required,
        boolean verified,
        Instant verifiedAt,
        String declineReason,
        boolean providerConfigured) {}
