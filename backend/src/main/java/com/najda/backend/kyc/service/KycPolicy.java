package com.najda.backend.kyc.service;

import com.najda.backend.kyc.config.KycProperties;
import com.najda.backend.kyc.model.KycStatus;
import java.time.Instant;

/** Who must be verified before reporting. Pure, so the rule is easy to read and to test. */
public final class KycPolicy {

    private KycPolicy() {}

    /** Does the verification requirement apply to this person at all? */
    public static boolean gateApplies(KycProperties properties, String roleName, Instant accountCreatedAt) {
        if (!properties.required()) return false;

        boolean exempt = roleName != null
                && properties.exemptRoles().stream().anyMatch(role -> role.equalsIgnoreCase(roleName));
        if (exempt) return false;

        Instant cutoff = properties.grandfatherInstant();
        boolean grandfathered = cutoff != null && accountCreatedAt != null && accountCreatedAt.isBefore(cutoff);
        return !grandfathered;
    }

    public static boolean mayReport(KycProperties properties, String roleName, Instant accountCreatedAt, KycStatus status) {
        return !gateApplies(properties, roleName, accountCreatedAt) || status == KycStatus.VERIFIED;
    }
}
