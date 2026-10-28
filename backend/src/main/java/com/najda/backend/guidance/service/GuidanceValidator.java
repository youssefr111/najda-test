package com.najda.backend.guidance.service;

import com.najda.backend.content.LocalizedTextValidator;
import com.najda.backend.guidance.dto.GuidanceCard;
import com.najda.backend.guidance.dto.GuidanceCategory;
import com.najda.backend.guidance.dto.GuidanceContent;
import com.najda.backend.incident.model.IncidentCategory;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * The single authority on what a valid guidance document looks like. Returns a trimmed,
 * normalised copy, or throws a {@link GuidanceValidationException} listing every problem.
 */
@Component
public class GuidanceValidator {

    private static final Pattern CARD_ID = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");

    private static final int MAX_ID = 64;
    private static final int MAX_TITLE = 120;
    private static final int MAX_STEP = 400;
    private static final int MAX_WARNING = 400;
    private static final int MAX_DISCLAIMER = 600;
    private static final int MAX_STEPS = 10;
    private static final int MAX_CARDS_PER_CATEGORY = 40;
    private static final int MAX_MIN_INJURED = 50;

    public GuidanceContent validate(GuidanceContent content) {
        if (content == null) {
            throw new GuidanceValidationException(List.of("Guidance content is missing."));
        }
        List<String> problems = new ArrayList<>();

        Map<String, String> disclaimer = text(content.disclaimer(), "Disclaimer", MAX_DISCLAIMER, true, problems);

        List<GuidanceCategory> categories = new ArrayList<>();
        Set<IncidentCategory> seenCategories = EnumSet.noneOf(IncidentCategory.class);
        Set<String> seenCardIds = new HashSet<>();

        if (content.categories() == null) {
            problems.add("Categories are missing.");
        } else {
            for (GuidanceCategory category : content.categories()) {
                GuidanceCategory checked = category(category, seenCategories, seenCardIds, problems);
                if (checked != null) {
                    categories.add(checked);
                }
            }
        }

        if (!problems.isEmpty()) {
            throw new GuidanceValidationException(problems);
        }
        return new GuidanceContent(disclaimer, categories);
    }

    private GuidanceCategory category(GuidanceCategory category, Set<IncidentCategory> seenCategories,
                                      Set<String> seenCardIds, List<String> problems) {
        if (category == null || category.category() == null) {
            problems.add("A category has no type.");
            return null;
        }
        String where = category.category().name();
        if (!seenCategories.add(category.category())) {
            problems.add(where + ": category appears more than once.");
        }
        List<GuidanceCard> source = category.cards();
        if (source == null || source.isEmpty()) {
            problems.add(where + ": add at least one card, or remove the category.");
            return null;
        }
        if (source.size() > MAX_CARDS_PER_CATEGORY) {
            problems.add(where + ": at most " + MAX_CARDS_PER_CATEGORY + " cards.");
        }
        if (source.stream().filter(card -> card != null && card.general()).count() > 1) {
            problems.add(where + ": only one card can be the general card.");
        }

        List<GuidanceCard> cards = new ArrayList<>();
        for (GuidanceCard card : source) {
            GuidanceCard checked = card(card, where, seenCardIds, problems);
            if (checked != null) {
                cards.add(checked);
            }
        }
        return new GuidanceCategory(category.category(), cards);
    }

    private GuidanceCard card(GuidanceCard card, String categoryName, Set<String> seenCardIds, List<String> problems) {
        if (card == null) {
            problems.add(categoryName + ": a card is empty.");
            return null;
        }
        String id = card.id() == null ? "" : card.id().trim();
        String where = categoryName + " / " + (id.isEmpty() ? "(no id)" : id);

        if (id.isEmpty() || id.length() > MAX_ID || !CARD_ID.matcher(id).matches()) {
            problems.add(where + ": id must be lowercase letters, digits and hyphens (max " + MAX_ID + ").");
        } else if (!seenCardIds.add(id)) {
            problems.add(where + ": id is used by another card.");
        }

        Integer minInjured = card.minInjured();
        if (minInjured != null && (minInjured < 1 || minInjured > MAX_MIN_INJURED)) {
            problems.add(where + ": minimum injured must be between 1 and " + MAX_MIN_INJURED + ".");
        }

        Map<String, String> title = text(card.title(), where + " title", MAX_TITLE, true, problems);
        Map<String, String> warning = text(card.warning(), where + " warning", MAX_WARNING, false, problems);

        List<Map<String, String>> steps = new ArrayList<>();
        if (card.steps() == null || card.steps().isEmpty()) {
            problems.add(where + ": add at least one step.");
        } else {
            if (card.steps().size() > MAX_STEPS) {
                problems.add(where + ": at most " + MAX_STEPS + " steps.");
            }
            for (int i = 0; i < card.steps().size(); i++) {
                steps.add(text(card.steps().get(i), where + " step " + (i + 1), MAX_STEP, true, problems));
            }
        }
        return new GuidanceCard(id, card.general(), minInjured, title, steps, warning);
    }

    private Map<String, String> text(Map<String, String> raw, String where, int max, boolean required,
                                     List<String> problems) {
        return LocalizedTextValidator.validate(raw, where, max, required, problems);
    }
}
