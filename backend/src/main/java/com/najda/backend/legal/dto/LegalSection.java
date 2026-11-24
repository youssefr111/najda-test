package com.najda.backend.legal.dto;

import java.util.List;
import java.util.Map;

/** @param id stable slug, unique within the document (used for anchors) */
public record LegalSection(String id, Map<String, String> title, List<LegalBlock> blocks) {
}
