package com.najda.backend.kyc;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.najda.backend.kyc.config.KycProperties;
import com.najda.backend.kyc.model.KycStatus;
import com.najda.backend.kyc.service.KycPolicy;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class KycPolicyTest {

    private static KycProperties props(boolean required, String grandfatherBefore) {
        return new KycProperties(required, grandfatherBefore, List.of("ADMIN", "SUPER_ADMIN"),
                new KycProperties.Didit("https://x", "k", "w", "s", "live", null, ""));
    }

    private static final Instant OLD = Instant.parse("2026-01-01T00:00:00Z");
    private static final Instant NEW = Instant.parse("2026-12-01T00:00:00Z");

    @Test
    void nothingIsEnforcedWhileTheSwitchIsOff() {
        assertFalse(KycPolicy.gateApplies(props(false, null), "CITIZEN", NEW));
        assertTrue(KycPolicy.mayReport(props(false, null), "CITIZEN", NEW, KycStatus.NOT_STARTED));
    }

    @Test
    void anUnverifiedCitizenCannotReportOnceItIsOn() {
        assertTrue(KycPolicy.gateApplies(props(true, null), "CITIZEN", NEW));
        assertFalse(KycPolicy.mayReport(props(true, null), "CITIZEN", NEW, KycStatus.NOT_STARTED));
        assertFalse(KycPolicy.mayReport(props(true, null), "CITIZEN", NEW, KycStatus.IN_REVIEW));
        assertFalse(KycPolicy.mayReport(props(true, null), "CITIZEN", NEW, KycStatus.DECLINED));
        assertTrue(KycPolicy.mayReport(props(true, null), "CITIZEN", NEW, KycStatus.VERIFIED));
    }

    @Test
    void respondersAreGatedLikeCitizensBecauseTheyReportAsTheYPublic() {
        assertFalse(KycPolicy.mayReport(props(true, null), "FIRST_RESPONDER", NEW, KycStatus.NOT_STARTED));
    }

    @Test
    void adminsAreExemptSoTheyCanTestTheSystem() {
        assertTrue(KycPolicy.mayReport(props(true, null), "ADMIN", NEW, KycStatus.NOT_STARTED));
        assertTrue(KycPolicy.mayReport(props(true, null), "super_admin", NEW, KycStatus.NOT_STARTED));
    }

    @Test
    void accountsCreatedBeforeTheCutoffAreGrandfathered() {
        KycProperties p = props(true, "2026-11-01T00:00:00Z");
        assertFalse(KycPolicy.gateApplies(p, "CITIZEN", OLD));
        assertTrue(KycPolicy.gateApplies(p, "CITIZEN", NEW));
        assertTrue(KycPolicy.mayReport(p, "CITIZEN", OLD, KycStatus.NOT_STARTED));
        assertFalse(KycPolicy.mayReport(p, "CITIZEN", NEW, KycStatus.NOT_STARTED));
    }
}
