package com.najda.backend.user.dto;

public record OrphanedPostgresUserResponse(Long id, String email, String firebaseUid) {}