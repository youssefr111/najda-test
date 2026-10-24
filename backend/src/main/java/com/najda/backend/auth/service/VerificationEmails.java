package com.najda.backend.auth.service;

import com.najda.backend.mail.EmailMessage;
import java.time.Duration;

/** Content of the registration OTP email. */
final class VerificationEmails {

    private VerificationEmails() {
    }

    static EmailMessage otp(String to, String code, Duration validFor) {
        long minutes = validFor.toMinutes();

        String text = """
                Your Najda verification code is %s.

                It expires in %d minutes. If you didn't request this, you can safely ignore this email.
                """.formatted(code, minutes);

        String html = """
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
                  <h2 style="margin-bottom:8px">Verify your email</h2>
                  <p>Use this code to finish creating your Najda account:</p>
                  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">%s</p>
                  <p style="color:#64748b;font-size:14px">
                    The code expires in %d minutes. If you didn't request it, you can safely ignore this email.
                  </p>
                </div>
                """.formatted(code, minutes);

        return new EmailMessage(to, "Your Najda verification code", text, html);
    }
}