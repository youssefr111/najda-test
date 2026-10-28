package com.najda.backend.guidance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.guidance.dto.GuidanceContent;
import java.io.IOException;
import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * On startup, loads {@code content/guidance.json} as the starting guidance. It only fills an empty
 * database: once an admin has saved anything, the stored version always wins.
 */
@Component
public class GuidanceSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(GuidanceSeeder.class);
    private static final String SEED = "content/guidance.json";

    private final GuidanceService guidanceService;
    private final ObjectMapper objectMapper;

    public GuidanceSeeder(GuidanceService guidanceService, ObjectMapper objectMapper) {
        this.guidanceService = guidanceService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        ClassPathResource resource = new ClassPathResource(SEED);
        if (!resource.exists()) {
            log.warn("No guidance seed found at {}", SEED);
            return;
        }
        try (InputStream in = resource.getInputStream()) {
            guidanceService.seedIfMissing(objectMapper.readValue(in, GuidanceContent.class));
        }
    }
}
