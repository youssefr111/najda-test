package com.najda.backend.kyc.config;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Identity verification settings ({@code najda.kyc.*}).
 *
 * @param required         when true, a person who is not verified cannot file an emergency report. Off by default, so
 *                         deploying the feature does not lock anyone out before they had a chance to verify.
 * @param grandfatherBefore optional ISO-8601 instant. Accounts created BEFORE it are never blocked (they are only
 *                         invited to verify); leave empty to enforce for everyone.
 * @param exemptRoles      roles that are never blocked (admins, so they can test the system).
 */
@ConfigurationProperties(prefix = "najda.kyc")
public record KycProperties(
        @DefaultValue("false") boolean required,
        String grandfatherBefore,
        @DefaultValue({"ADMIN", "SUPER_ADMIN"}) List<String> exemptRoles,
        @DefaultValue Didit didit) {

    /**
     * @param environment "live" or "sandbox": which Didit application these credentials belong to. A webhook that
     *                    says it came from the OTHER environment is ignored, so a sandbox session can never verify a
     *                    real account (or the reverse).
     * @param vendorPrefix a short tag for THIS deployment ("local-", "test-", "prod-"). It is put in front of the user
     *                    id we send Didit as vendor_data. Several deployments can share one Didit application, and each
     *                    has its own database whose user ids overlap: without a prefix, user 5 on a laptop and user 5
     *                    in production would look like the same person to Didit, and a webhook meant for one
     *                    deployment could be applied to the other's user 5. Leave empty if only one deployment uses
     *                    the application.
     */
    public record Didit(
            @DefaultValue("https://verification.didit.me") String baseUrl,
            String apiKey,
            String workflowId,
            String webhookSecret,
            @DefaultValue("live") String environment,
            String returnUrl,
            @DefaultValue("") String vendorPrefix) {

        /** What we send Didit as {@code vendor_data} for this user. */
        public String vendorData(Long userId) {
            return (vendorPrefix == null ? "" : vendorPrefix) + userId;
        }

        /** The user id in a webhook's {@code vendor_data}, or null if it is not ours (other prefix, not a number). */
        public Long userIdFrom(String vendorData) {
            String prefix = vendorPrefix == null ? "" : vendorPrefix;
            if (vendorData == null || !vendorData.startsWith(prefix)) return null;
            String rest = vendorData.substring(prefix.length()).trim();
            try {
                return rest.isEmpty() ? null : Long.valueOf(rest);
            } catch (NumberFormatException e) {
                return null;
            }
        }

        public boolean configured() {
            return notBlank(apiKey) && notBlank(workflowId) && notBlank(webhookSecret);
        }

        private static boolean notBlank(String value) {
            return value != null && !value.isBlank();
        }
    }

    public Instant grandfatherInstant() {
        if (grandfatherBefore == null || grandfatherBefore.isBlank()) return null;
        try {
            return Instant.parse(grandfatherBefore.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalStateException("najda.kyc.grandfather-before must be an ISO-8601 instant, e.g. 2026-11-01T00:00:00Z", e);
        }
    }
}
