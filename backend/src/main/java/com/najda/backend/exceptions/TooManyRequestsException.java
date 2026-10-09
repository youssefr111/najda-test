package com.najda.backend.exceptions;

import java.time.Duration;

/** Mapped to HTTP 429 (with a Retry-After header when {@code retryAfter} is known). */
public class TooManyRequestsException extends RuntimeException {

    private final Duration retryAfter;

    public TooManyRequestsException(String message) {
        this(message, null);
    }

    public TooManyRequestsException(String message, Duration retryAfter) {
        super(message);
        this.retryAfter = retryAfter;
    }

    public Duration getRetryAfter() {
        return retryAfter;
    }
}