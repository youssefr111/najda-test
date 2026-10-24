package com.najda.backend.guidance.service;

import java.util.List;

/** The submitted guidance is incomplete or malformed. Carries every problem found, not just the first. */
public class GuidanceValidationException extends RuntimeException {

    private final List<String> problems;

    public GuidanceValidationException(List<String> problems) {
        super(String.join(" • ", problems));
        this.problems = List.copyOf(problems);
    }

    public List<String> getProblems() {
        return problems;
    }
}
