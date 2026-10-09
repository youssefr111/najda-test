package com.najda.backend.mail;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/** All required: the app refuses to start without a working email setup. */
@Validated
@ConfigurationProperties(prefix = "najda.mail")
public record EmailProperties(
        @NotBlank String apiKey,
        @NotBlank @Email String fromEmail,
        @DefaultValue("Najda") @NotBlank String fromName,
        @DefaultValue("https://api.brevo.com") @NotBlank String baseUrl
) {

    @Override
    public String toString() {
        return "EmailProperties[fromEmail=" + fromEmail + ", fromName=" + fromName + ", baseUrl=" + baseUrl + ", apiKey=***]";
    }
}