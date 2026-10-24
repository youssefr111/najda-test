package com.najda.backend.exceptions;

/** The person must verify their email address before doing this. Mapped to HTTP 403 with the code EMAIL_REQUIRED. */
public class EmailVerificationRequiredException extends RuntimeException {
    public EmailVerificationRequiredException(String message) {
        super(message);
    }
}