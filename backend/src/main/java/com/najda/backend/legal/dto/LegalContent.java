package com.najda.backend.legal.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

/** The body of a legal document, exactly as stored. {@code subtitle} is optional. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LegalContent(Map<String, String> title, Map<String, String> subtitle, List<LegalSection> sections) {
}
