package com.najda.backend.auth.dto;

public record SendEmailCodeResponse(long resendAfterSeconds, long expiresInSeconds) {
}