package com.najda.backend.user.dto;

public record CreateApplicationDocumentRequest(Long applicationId, String path, String originalFileName) {}