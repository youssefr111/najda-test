package com.najda.backend.legal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.legal.dto.LegalContent;
import com.najda.backend.legal.model.LegalDocumentType;
import java.io.IOException;
import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * On startup, loads {@code content/legal/<type>.json} as version 1 of each document. It only fills a
 * document that has no version yet: published versions are never touched.
 */
/** Runs before the system-user initializer (order 2), which records those accounts' acceptance of version 1. */
@Component
@Order(0)
public class LegalSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LegalSeeder.class);

    private final LegalDocumentService documents;
    private final ObjectMapper objectMapper;

    public LegalSeeder(LegalDocumentService documents, ObjectMapper objectMapper) {
        this.documents = documents;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        for (LegalDocumentType type : LegalDocumentType.values()) {
            String path = "content/legal/" + type.slug() + ".json";
            ClassPathResource resource = new ClassPathResource(path);
            if (!resource.exists()) {
                log.warn("No legal seed found at {}", path);
                continue;
            }
            try (InputStream in = resource.getInputStream()) {
                documents.seedIfMissing(type, objectMapper.readValue(in, LegalContent.class));
            }
        }
    }
}
