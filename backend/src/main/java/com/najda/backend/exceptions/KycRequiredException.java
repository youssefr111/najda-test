package com.najda.backend.exceptions;

/** The person must verify their identity before doing this. Mapped to HTTP 403 with the code KYC_REQUIRED. */
public class KycRequiredException extends RuntimeException {
    public KycRequiredException(String message) {
        super(message);
    }
}
