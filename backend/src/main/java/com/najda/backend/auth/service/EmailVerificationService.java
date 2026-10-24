package com.najda.backend.auth.service;

import com.najda.backend.auth.dto.SendEmailCodeResponse;
import com.najda.backend.auth.dto.VerifyEmailCodeResponse;

public interface EmailVerificationService {

    /** Emails a fresh code. Rejects already-registered addresses and enforces resend limits. */
    SendEmailCodeResponse sendCode(String email);

    /** Checks the code; on success returns the token that authorises registering this email. */
    VerifyEmailCodeResponse verifyCode(String email, String code);

    /** @throws com.najda.backend.exceptions.EmailNotVerifiedException unless {@code email} was verified with this token. */
    void requireVerified(String email, String verificationToken);

    /** Removes the verification record once the account exists. Joins the caller's transaction. */
    void consume(String email);
}