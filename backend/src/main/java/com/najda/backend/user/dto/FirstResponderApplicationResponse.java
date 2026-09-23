package com.najda.backend.user.dto;

import java.time.LocalDateTime;
import java.util.List;

public record FirstResponderApplicationResponse(
        Long id, Long citizenId, String citizenName, String motivation, String status,
        LocalDateTime submittedAt, LocalDateTime reviewedAt, String reviewNotes,
        List<FirstResponderApplicationDocumentResponse> documents
) {}