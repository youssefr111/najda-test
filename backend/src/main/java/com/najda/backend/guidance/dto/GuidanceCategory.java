package com.najda.backend.guidance.dto;

import com.najda.backend.incident.model.IncidentCategory;
import java.util.List;

/** The cards shown to a citizen whose report has this category. */
public record GuidanceCategory(IncidentCategory category, List<GuidanceCard> cards) {
}
