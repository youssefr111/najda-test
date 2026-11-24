package com.najda.backend.kyc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.najda.backend.kyc.config.KycProperties;
import org.junit.jupiter.api.Test;

class KycVendorDataTest {

    private static KycProperties.Didit didit(String prefix) {
        return new KycProperties.Didit("https://x", "k", "w", "s", "live", null, prefix);
    }

    @Test
    void roundTripsWithPrefix() {
        KycProperties.Didit d = didit("test-");
        assertEquals("test-12", d.vendorData(12L));
        assertEquals(12L, d.userIdFrom("test-12"));
    }

    @Test
    void rejectsAnotherDeploymentsVendorData() {
        assertNull(didit("prod-").userIdFrom("test-12"));
        assertNull(didit("prod-").userIdFrom("12"));
        assertNull(didit("prod-").userIdFrom("prod-abc"));
        assertNull(didit("prod-").userIdFrom(""));
    }

    @Test
    void emptyPrefixKeepsPlainIds() {
        assertEquals("7", didit("").vendorData(7L));
        assertEquals(7L, didit("").userIdFrom("7"));
        assertEquals("7", didit(null).vendorData(7L));
    }
}
