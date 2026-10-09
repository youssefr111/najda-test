package com.najda.backend.auth.service;

import com.najda.backend.auth.config.OtpProperties;
import com.najda.backend.auth.dto.SendEmailCodeResponse;
import com.najda.backend.auth.dto.VerifyEmailCodeResponse;
import com.najda.backend.auth.model.EmailVerification;
import com.najda.backend.auth.repository.EmailVerificationRepository;
import com.najda.backend.auth.util.EmailAddresses;
import com.najda.backend.exceptions.EmailAlreadyRegisteredException;
import com.najda.backend.exceptions.EmailNotVerifiedException;
import com.najda.backend.exceptions.InvalidVerificationCodeException;
import com.najda.backend.exceptions.TooManyRequestsException;
import com.najda.backend.mail.EmailSender;
import com.najda.backend.security.ratelimit.InMemoryRateLimiter;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmailVerificationServiceImpl implements EmailVerificationService {

    private static final int MAX_SENDS_PER_EMAIL_PER_HOUR = 5;

    private final EmailVerificationRepository repository;
    private final EmailAvailabilityService emailAvailabilityService;
    private final OtpCodec otpCodec;
    private final OtpProperties properties;
    private final EmailSender emailSender;
    private final InMemoryRateLimiter rateLimiter;
    private final Clock clock;

    /**
     * The email is sent inside the transaction on purpose: if delivery fails the
     * new code (and its resend cooldown) roll back, so the user can simply retry.
     * SMTP timeouts are capped at a few seconds, which bounds how long the row stays locked.
     */
    @Override
    @Transactional
    public SendEmailCodeResponse sendCode(String rawEmail) {
        String email = EmailAddresses.normalize(rawEmail);
        rateLimiter.check("otp-send:email:" + email, MAX_SENDS_PER_EMAIL_PER_HOUR, Duration.ofHours(1));

        if (emailAvailabilityService.isTaken(email)) {
            throw new EmailAlreadyRegisteredException();
        }

        Instant now = Instant.now(clock);
        EmailVerification verification = repository.findByEmailForUpdate(email)
                .orElseGet(() -> EmailVerification.forEmail(email));

        if (!verification.canResendAt(now)) {
            throw new TooManyRequestsException(
                    "Please wait before requesting another code.",
                    Duration.between(now, verification.getResendAvailableAt()));
        }

        String code = otpCodec.generateCode();
        verification.issue(otpCodec.hashOtp(email, code), now, properties.codeTtl(), properties.resendCooldown());
        save(verification);

        emailSender.send(VerificationEmails.otp(email, code, properties.codeTtl()));

        return new SendEmailCodeResponse(
                properties.resendCooldown().toSeconds(),
                properties.codeTtl().toSeconds());
    }

    /** noRollbackFor: a failed guess must still be persisted, or the attempt limit would be meaningless. */
    @Override
    @Transactional(noRollbackFor = {InvalidVerificationCodeException.class, TooManyRequestsException.class})
    public VerifyEmailCodeResponse verifyCode(String rawEmail, String code) {
        String email = EmailAddresses.normalize(rawEmail);
        Instant now = Instant.now(clock);

        EmailVerification verification = repository.findByEmailForUpdate(email)
                .orElseThrow(InvalidVerificationCodeException::new);

        if (verification.isCodeExpired(now)) {
            throw new InvalidVerificationCodeException();
        }
        if (!verification.hasAttemptsLeft(properties.maxAttempts())) {
            throw new TooManyRequestsException("Too many incorrect attempts. Please request a new code.");
        }
        if (!otpCodec.otpMatches(email, code, verification.getCodeHash())) {
            verification.recordFailedAttempt();
            throw new InvalidVerificationCodeException();
        }

        String token = otpCodec.generateToken();
        verification.markVerified(now, properties.verifiedTtl(), otpCodec.hashToken(token));
        return new VerifyEmailCodeResponse(token, properties.verifiedTtl().toSeconds());
    }

    @Override
    @Transactional(readOnly = true)
    public void requireVerified(String rawEmail, String verificationToken) {
        Instant now = Instant.now(clock);
        repository.findByEmail(EmailAddresses.normalize(rawEmail))
                .filter(v -> v.isVerifiedAt(now))
                .filter(v -> otpCodec.tokenMatches(verificationToken, v.getRegistrationTokenHash()))
                .orElseThrow(EmailNotVerifiedException::new);
    }

    @Override
    @Transactional
    public void consume(String rawEmail) {
        repository.deleteByEmail(EmailAddresses.normalize(rawEmail));
    }

    private void save(EmailVerification verification) {
        try {
            repository.saveAndFlush(verification);
        } catch (DataIntegrityViolationException e) {
            // Two first-time requests for the same address raced on the unique index.
            throw new TooManyRequestsException("A code was just sent to this address.", properties.resendCooldown());
        }
    }
}