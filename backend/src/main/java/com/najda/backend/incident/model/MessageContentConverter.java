package com.najda.backend.incident.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Transparent field-level encryption for message content, at rest.
 * AES-256-GCM -- authenticated encryption, so any tampering with stored
 * ciphertext is detected on read, not just kept confidential.
 *
 * Protects against DB dumps, backups, or unauthorized direct database
 * access. Deliberately NOT end-to-end encryption -- the app itself (and
 * therefore dispatchers/admins through it) can still read content, which
 * is a required feature here, not a gap true E2E would need to preserve.
 *
 * Relies on Spring Boot's auto-configured Hibernate bean container to
 * inject TEXT_ENCRYPTION_KEY into a JPA converter -- standard behavior
 * out of the box, worth knowing about only if this project's Hibernate
 * setup is ever customized away from Spring Boot's defaults.
 */
@Component
@Converter(autoApply = false)
public class MessageContentConverter implements AttributeConverter<String, String> {

    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final SecretKeySpec keySpec;
    private final SecureRandom secureRandom = new SecureRandom();

    public MessageContentConverter(@Value("${TEXT_ENCRYPTION_KEY}") String base64Key) {
        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        this.keySpec = new SecretKeySpec(keyBytes, "AES");
    }

    @Override
    public String convertToDatabaseColumn(String plainText) {
        if (plainText == null) return null;
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt chat message content", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String storedValue) {
        if (storedValue == null) return null;
        try {
            byte[] combined = Base64.getDecoder().decode(storedValue);
            if (combined.length <= GCM_IV_LENGTH) {
                return storedValue; // too short to be real ciphertext -- pre-encryption row, return as-is
            }
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] cipherText = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(combined, GCM_IV_LENGTH, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException notBase64) {
            return storedValue; // not valid base64 at all -- definitely a pre-encryption row
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt chat message content", e);
        }
    }
}