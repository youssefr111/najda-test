package com.najda.backend.incident.dto;

import java.time.LocalDateTime;

public record ChatMessageResponse(
        Long id,
        Long senderId,
        String senderName,
        String senderRole,
        String content,
        LocalDateTime sentAt
) {}