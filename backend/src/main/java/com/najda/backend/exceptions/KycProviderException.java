package com.najda.backend.exceptions;

/** The identity-verification provider could not be reached or answered with an error. Mapped to HTTP 503. */
public class KycProviderException extends RuntimeException {
    public KycProviderException(String message) {
        super(message);
    }

    public KycProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
