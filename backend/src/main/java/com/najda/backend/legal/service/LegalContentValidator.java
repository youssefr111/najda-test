package com.najda.backend.legal.service;

import com.najda.backend.content.LocalizedTextValidator;
import com.najda.backend.legal.dto.LegalBlock;
import com.najda.backend.legal.dto.LegalContent;
import com.najda.backend.legal.dto.LegalSection;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * The single authority on what a valid legal document looks like. Returns a trimmed, normalised copy,
 * or throws a {@link LegalValidationException} listing every problem.
 */
@Component
public class LegalContentValidator {

    private static final Pattern SECTION_ID = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    /** Everything inside the parentheses of a {@code [label](target)} link. */
    private static final Pattern LINK_TARGET = Pattern.compile("\\]\\(([^)]*)\\)");
    /** Links may only point to pages of the app itself, never to another site. */
    private static final Pattern INTERNAL_PATH = Pattern.compile("^/[A-Za-z0-9/_-]*$");

    private static final int MAX_ID = 64;
    private static final int MAX_TITLE = 150;
    private static final int MAX_SUBTITLE = 300;
    private static final int MAX_SECTIONS = 40;
    private static final int MAX_BLOCKS = 40;
    private static final int MAX_TEXT = 6000;
    private static final int MAX_ITEMS = 40;
    private static final int MAX_ITEM = 2000;
    private static final int MAX_SUMMARY = 600;

    public LegalContent validate(LegalContent content) {
        if (content == null) {
            throw new LegalValidationException(List.of("The document is missing."));
        }
        List<String> problems = new ArrayList<>();

        Map<String, String> title = text(content.title(), "Title", MAX_TITLE, true, problems);
        Map<String, String> subtitle = text(content.subtitle(), "Subtitle", MAX_SUBTITLE, false, problems);

        List<LegalSection> sections = new ArrayList<>();
        Set<String> seenIds = new HashSet<>();
        if (content.sections() == null || content.sections().isEmpty()) {
            problems.add("Add at least one section.");
        } else {
            if (content.sections().size() > MAX_SECTIONS) {
                problems.add("At most " + MAX_SECTIONS + " sections.");
            }
            for (int i = 0; i < content.sections().size(); i++) {
                sections.add(section(content.sections().get(i), i + 1, seenIds, problems));
            }
        }

        if (!problems.isEmpty()) {
            throw new LegalValidationException(problems);
        }
        return new LegalContent(title, subtitle, sections);
    }

    /** The optional "what changed" note shown in the acceptance prompt. */
    public Map<String, String> validateChangeSummary(Map<String, String> raw) {
        List<String> problems = new ArrayList<>();
        Map<String, String> summary = text(raw, "Change summary", MAX_SUMMARY, false, problems);
        if (!problems.isEmpty()) {
            throw new LegalValidationException(problems);
        }
        return summary;
    }

    private LegalSection section(LegalSection section, int number, Set<String> seenIds, List<String> problems) {
        if (section == null) {
            problems.add("Section " + number + " is empty.");
            return null;
        }
        String id = section.id() == null ? "" : section.id().trim();
        String where = "Section " + number;

        if (id.isEmpty() || id.length() > MAX_ID || !SECTION_ID.matcher(id).matches()) {
            problems.add(where + ": id must be lowercase letters, digits and hyphens (max " + MAX_ID + ").");
        } else if (!seenIds.add(id)) {
            problems.add(where + ": id is used by another section.");
        }

        Map<String, String> title = text(section.title(), where + " title", MAX_TITLE, true, problems);

        List<LegalBlock> blocks = new ArrayList<>();
        if (section.blocks() == null || section.blocks().isEmpty()) {
            problems.add(where + ": add at least one paragraph or list.");
        } else {
            if (section.blocks().size() > MAX_BLOCKS) {
                problems.add(where + ": at most " + MAX_BLOCKS + " blocks.");
            }
            for (int i = 0; i < section.blocks().size(); i++) {
                blocks.add(block(section.blocks().get(i), where + " block " + (i + 1), problems));
            }
        }
        return new LegalSection(id, title, blocks);
    }

    private LegalBlock block(LegalBlock block, String where, List<String> problems) {
        if (block == null || block.type() == null) {
            problems.add(where + " has no type.");
            return null;
        }
        return switch (block.type()) {
            case HEADING, PARAGRAPH, NOTICE -> {
                if (block.items() != null && !block.items().isEmpty()) {
                    problems.add(where + ": a " + block.type().name().toLowerCase() + " cannot have list items.");
                }
                yield new LegalBlock(block.type(), text(block.text(), where, MAX_TEXT, true, problems), null);
            }
            case LIST -> {
                List<Map<String, String>> items = new ArrayList<>();
                if (block.items() == null || block.items().isEmpty()) {
                    problems.add(where + ": a list needs at least one item.");
                } else {
                    if (block.items().size() > MAX_ITEMS) {
                        problems.add(where + ": at most " + MAX_ITEMS + " list items.");
                    }
                    for (int i = 0; i < block.items().size(); i++) {
                        items.add(text(block.items().get(i), where + " item " + (i + 1), MAX_ITEM, true, problems));
                    }
                }
                yield new LegalBlock(block.type(), null, items);
            }
        };
    }

    /** Required/optional translated text, plus a check that every link points inside the app. */
    private Map<String, String> text(Map<String, String> raw, String where, int max, boolean required,
                                     List<String> problems) {
        Map<String, String> clean = LocalizedTextValidator.validate(raw, where, max, required, problems);
        if (clean != null) {
            clean.forEach((language, value) -> {
                Matcher links = LINK_TARGET.matcher(value);
                while (links.find()) {
                    if (!INTERNAL_PATH.matcher(links.group(1)).matches()) {
                        problems.add(where + " (" + language + "): links must point to a page of the app, like /support.");
                    }
                }
            });
        }
        return clean;
    }
}
