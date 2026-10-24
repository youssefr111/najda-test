package com.najda.backend.kyc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.najda.backend.kyc.service.DiditWebhookVerifier;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class DiditWebhookVerifierTest {

    private static final String SECRET = "test-secret";
    private static final byte[] BODY = "{\"event_id\":\"e1\",\"status\":\"Approved\"}".getBytes(StandardCharsets.UTF_8);
    private static final long NOW = 1_800_000_000L;

    private static String sign(byte[] body) {
        return DiditWebhookVerifier.hmacHex(body, SECRET);
    }

    @Test
    void knownHmacVector() {
        // RFC 4231 test case 2: HMAC-SHA256("Jefe", "what do ya want for nothing?")
        assertEquals("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
                DiditWebhookVerifier.hmacHex("what do ya want for nothing?".getBytes(StandardCharsets.UTF_8), "Jefe"));
    }

    @Test
    void acceptsAValidSignatureWithAFreshTimestamp() {
        assertTrue(DiditWebhookVerifier.verify(BODY, sign(BODY), String.valueOf(NOW), SECRET, NOW));
        assertTrue(DiditWebhookVerifier.verify(BODY, sign(BODY).toUpperCase(), String.valueOf(NOW - 299), SECRET, NOW));
    }

    @Test
    void rejectsATamperedBody() {
        byte[] tampered = "{\"event_id\":\"e1\",\"status\":\"Declined\"}".getBytes(StandardCharsets.UTF_8);
        assertFalse(DiditWebhookVerifier.verify(tampered, sign(BODY), String.valueOf(NOW), SECRET, NOW));
    }

    @Test
    void rejectsTheWrongSecret() {
        String forged = DiditWebhookVerifier.hmacHex(BODY, "someone-elses-secret");
        assertFalse(DiditWebhookVerifier.verify(BODY, forged, String.valueOf(NOW), SECRET, NOW));
    }

    @Test
    void rejectsAReplayedOrFutureDatedRequest() {
        assertFalse(DiditWebhookVerifier.verify(BODY, sign(BODY), String.valueOf(NOW - 301), SECRET, NOW));
        assertFalse(DiditWebhookVerifier.verify(BODY, sign(BODY), String.valueOf(NOW + 301), SECRET, NOW));
    }

    @Test
    void rejectsMissingOrMalformedInputs() {
        assertFalse(DiditWebhookVerifier.verify(BODY, null, String.valueOf(NOW), SECRET, NOW));
        assertFalse(DiditWebhookVerifier.verify(BODY, sign(BODY), null, SECRET, NOW));
        assertFalse(DiditWebhookVerifier.verify(BODY, sign(BODY), "not-a-number", SECRET, NOW));
        assertFalse(DiditWebhookVerifier.verify(BODY, sign(BODY), String.valueOf(NOW), "", NOW));
        assertFalse(DiditWebhookVerifier.verify(null, sign(BODY), String.valueOf(NOW), SECRET, NOW));
    }
}
