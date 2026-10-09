package com.najda.backend.auth.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "najda.auth.otp")
public record OtpProperties(
        /** HMAC key used to hash codes at rest. */
        @NotBlank @Size(min = 32, message = "must be at least 32 characters") String secret,
        @DefaultValue("10m") Duration codeTtl,
        @DefaultValue("60s") Duration resendCooldown,
        @DefaultValue("5") @Positive int maxAttempts,
        @DefaultValue("15m") Duration verifiedTtl
) {
}