package com.najda.backend.exceptions;

/** Wrong, expired, or unknown verification code. Deliberately one generic message. */
public class InvalidVerificationCodeException extends RuntimeException {

    public InvalidVerificationCodeException() {
        super("Invalid or expired verification code.");
    }
}