package com.najda.backend.exceptions;

/** A submitted location failed validation (outside Egypt, a pin too far from the device, pins turned off).
    Mapped to HTTP 422 by GlobalExceptionHandler. */
public class InvalidLocationException extends RuntimeException {
    public InvalidLocationException(String message) {
        super(message);
    }
}