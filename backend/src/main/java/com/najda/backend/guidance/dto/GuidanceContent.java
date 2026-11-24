package com.najda.backend.guidance.dto;

import java.util.List;
import java.util.Map;

/** The whole guidance document, exactly as stored in {@code content_documents}. */
public record GuidanceContent(Map<String, String> disclaimer, List<GuidanceCategory> categories) {
}
