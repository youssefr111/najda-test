package com.najda.backend.exceptions;

/** The phone number is already verified on another account. Mapped to HTTP 422. */
public class PhoneAlreadyInUseException extends RuntimeException {

    public PhoneAlreadyInUseException() {
        super("This phone number is already verified on another account.");
    }
}