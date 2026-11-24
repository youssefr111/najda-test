package com.najda.backend.incident.dto;

import java.time.Instant;

public record ChatMessageResponse(
        Long id,
        Long senderId,
        String senderName,
        String senderRole,
        String content,
        Instant sentAt
) {}