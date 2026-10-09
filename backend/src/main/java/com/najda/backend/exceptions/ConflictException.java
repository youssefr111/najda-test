package com.najda.backend.exceptions;

/** Thrown when a request conflicts with existing state -- e.g. attempting
    to start a second shift for an employee who already has an active one,
    or assigning a second LEAD to a vehicle that already has one. Mapped to
    HTTP 409 by the calling controller. */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}