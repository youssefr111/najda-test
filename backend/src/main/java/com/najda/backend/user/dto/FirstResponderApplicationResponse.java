package com.najda.backend.user.dto;

import java.time.Instant;
import java.util.List;

public record FirstResponderApplicationResponse(
        Long id, Long citizenId, String citizenName, String motivation, String status,
        Instant submittedAt, Instant reviewedAt, String reviewNotes,
        List<FirstResponderApplicationDocumentResponse> documents
) {}