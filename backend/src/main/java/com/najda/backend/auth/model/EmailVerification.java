package com.najda.backend.auth.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Registration-time proof that someone controls an email address.
 *
 * Lifecycle: {@link #issue} a code -> {@link #markVerified} once the right
 * code is entered (which yields a one-time registration token, stored only as
 * a hash) -> row is deleted when the account is created, or purged after expiry.
 * All timestamps are UTC wall-clock, produced from the application Clock.
 */
@Entity
@Table(name = "email_verifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false, length = 254)
    private String email;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "resend_available_at", nullable = false)
    private Instant resendAvailableAt;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "verified_until")
    private Instant verifiedUntil;

    @Column(name = "registration_token_hash", length = 64)
    private String registrationTokenHash;

    public static EmailVerification forEmail(String email) {
        EmailVerification verification = new EmailVerification();
        verification.email = email;
        return verification;
    }

    /** Starts a fresh verification round, discarding any previous code or verified state. */
    public void issue(String codeHash, Instant now, Duration codeTtl, Duration resendCooldown) {
        this.codeHash = codeHash;
        this.expiresAt = now.plus(codeTtl);
        this.resendAvailableAt = now.plus(resendCooldown);
        this.attempts = 0;
        this.verifiedUntil = null;
        this.registrationTokenHash = null;
    }

    public boolean canResendAt(Instant now) {
        return resendAvailableAt == null || !now.isBefore(resendAvailableAt);
    }

    public boolean isCodeExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    public boolean hasAttemptsLeft(int maxAttempts) {
        return attempts < maxAttempts;
    }

    public void recordFailedAttempt() {
        attempts++;
    }

    public void markVerified(Instant now, Duration validFor, String registrationTokenHash) {
        this.verifiedUntil = now.plus(validFor);
        this.registrationTokenHash = registrationTokenHash;
    }

    public boolean isVerifiedAt(Instant now) {
        return verifiedUntil != null && now.isBefore(verifiedUntil);
    }
}