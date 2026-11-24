package com.najda.backend.guidance.dto;

import java.time.Instant;

public record GuidanceResponse(long version, Instant updatedAt, GuidanceContent content) {
}
