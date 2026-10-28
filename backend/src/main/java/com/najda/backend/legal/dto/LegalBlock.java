package com.najda.backend.legal.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.najda.backend.legal.model.LegalBlockType;
import java.util.List;
import java.util.Map;

/**
 * One piece of a section: a sub-heading or paragraph (uses {@code text}) or a bulleted list
 * (uses {@code items}). Texts may contain internal links written as {@code [label](/path)}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LegalBlock(LegalBlockType type, Map<String, String> text, List<Map<String, String>> items) {
}
