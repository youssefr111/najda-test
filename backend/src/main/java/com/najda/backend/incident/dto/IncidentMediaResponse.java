package com.najda.backend.incident.dto;

import com.najda.backend.incident.model.MediaType;
import com.najda.backend.incident.model.TranscriptStatus;
import java.time.Instant;

/**
 * @param transcript       machine-extracted text: speech transcript for AUDIO / VIDEO, description for PHOTO; null until ready.
 *                         Show it to dispatchers labelled as automatic: it can contain errors.
 * @param transcriptStatus null when the attachment is not analysed (TEXT, or the feature is off).
 */
public record IncidentMediaResponse(
        Long id, MediaType mediaType, String textContent, Instant uploadedAt, Instant updatedAt,
        String transcript, TranscriptStatus transcriptStatus, String transcriptLanguage, String transcriptAr
) {}