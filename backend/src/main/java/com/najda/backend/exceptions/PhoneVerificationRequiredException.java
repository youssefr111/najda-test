package com.najda.backend.exceptions;

/** The person must verify their phone number before doing this. Mapped to HTTP 403 with the code PHONE_REQUIRED. */
public class PhoneVerificationRequiredException extends RuntimeException {
    public PhoneVerificationRequiredException(String message) {
        super(message);
    }
}