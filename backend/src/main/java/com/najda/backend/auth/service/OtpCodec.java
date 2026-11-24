package com.najda.backend.auth.service;

import com.najda.backend.auth.config.OtpProperties;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/** Generates and hashes one-time codes and registration tokens. Nothing secret is ever stored in plain text. */
@Component
public class OtpCodec {

    public static final int CODE_LENGTH = 6;

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final int TOKEN_BYTES = 32;

    private final SecureRandom random = new SecureRandom();
    private final SecretKeySpec hmacKey;

    public OtpCodec(OtpProperties properties) {
        this.hmacKey = new SecretKeySpec(properties.secret().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
    }

    public String generateCode() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    /** Keyed hash bound to the email, so a leaked hash is useless without the server secret. */
    public String hashOtp(String email, String code) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(hmacKey);
            byte[] digest = mac.doFinal((email + ':' + code).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 is unavailable", e);
        }
    }

    public boolean otpMatches(String email, String code, String expectedHash) {
        return constantTimeEquals(hashOtp(email, code), expectedHash);
    }

    /** 256 bits of randomness -- high enough entropy that a plain SHA-256 is sufficient for storage. */
    public String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    public boolean tokenMatches(String token, String expectedHash) {
        return expectedHash != null && constantTimeEquals(hashToken(token), expectedHash);
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}