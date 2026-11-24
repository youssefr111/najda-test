package com.najda.backend.kyc.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Checks that a webhook really comes from Didit: HMAC-SHA256 (hex) of the EXACT request bytes with the destination's
 * secret ({@code X-Signature}), and a fresh {@code X-Timestamp} (a captured request cannot be replayed later).
 *
 * We use the raw-bytes signature because this endpoint reads the raw body itself, before any JSON parser could
 * re-encode it. The weaker {@code X-Signature-Simple} (it does not cover the body) is deliberately NOT accepted.
 */
public final class DiditWebhookVerifier {

    /** Didit's own advice: reject anything older (or newer) than 5 minutes. */
    public static final long TOLERANCE_SECONDS = 300;

    private DiditWebhookVerifier() {}

    public static boolean verify(byte[] rawBody, String signatureHex, String timestampHeader, String secret, long nowEpochSeconds) {
        if (rawBody == null || signatureHex == null || timestampHeader == null || secret == null || secret.isBlank()) {
            return false;
        }

        long timestamp;
        try {
            timestamp = Long.parseLong(timestampHeader.trim());
        } catch (NumberFormatException e) {
            return false;
        }
        if (Math.abs(nowEpochSeconds - timestamp) > TOLERANCE_SECONDS) return false;

        String expected = hmacHex(rawBody, secret);
        // Constant-time comparison: do not leak how many leading characters matched.
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signatureHex.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    public static String hmacHex(byte[] data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(data);
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }
}
