package com.najda.backend.auth.dto;

/** {@code verificationToken} must be sent back when registering; it proves this client did the verification. */
public record VerifyEmailCodeResponse(String verificationToken, long validForSeconds) {

    @Override
    public String toString() {
        return "VerifyEmailCodeResponse[validForSeconds=" + validForSeconds + "]";
    }
}