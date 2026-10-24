package com.najda.backend.legal.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.audit.model.AuditLog;
import com.najda.backend.audit.repository.AuditLogRepository;
import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.legal.dto.LegalContent;
import com.najda.backend.legal.dto.LegalDocumentResponse;
import com.najda.backend.legal.dto.LegalVersionSummary;
import com.najda.backend.legal.dto.PublishLegalRequest;
import com.najda.backend.legal.model.LegalDocumentType;
import com.najda.backend.legal.model.LegalVersion;
import com.najda.backend.legal.repository.LegalRepository;
import com.najda.backend.notification.service.NotificationPublisher;
import com.najda.backend.notification.service.NotificationRecipients;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LegalDocumentServiceImpl implements LegalDocumentService {

    private static final Logger log = LoggerFactory.getLogger(LegalDocumentServiceImpl.class);
    private static final TypeReference<Map<String, String>> TEXT = new TypeReference<>() { };

    private final LegalRepository repository;
    private final LegalContentValidator validator;
    private final AuditLogRepository auditLogRepository;
    private final NotificationPublisher notifications;
    private final NotificationRecipients recipients;
    private final ObjectMapper objectMapper;

    public LegalDocumentServiceImpl(LegalRepository repository, LegalContentValidator validator,
                                    AuditLogRepository auditLogRepository, NotificationPublisher notifications,
                                    NotificationRecipients recipients, ObjectMapper objectMapper) {
        this.repository = repository;
        this.validator = validator;
        this.auditLogRepository = auditLogRepository;
        this.notifications = notifications;
        this.recipients = recipients;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public LegalDocumentResponse getLatest(LegalDocumentType type) {
        return toResponse(repository.findLatest(type)
                .orElseThrow(() -> new ResourceNotFoundException("No " + type.slug() + " has been published yet")));
    }

    @Override
    @Transactional(readOnly = true)
    public LegalDocumentResponse getVersion(LegalDocumentType type, int version) {
        return toResponse(repository.findVersion(type, version)
                .orElseThrow(() -> new ResourceNotFoundException("Version " + version + " does not exist")));
    }

    @Override
    @Transactional(readOnly = true)
    public List<LegalVersionSummary> listVersions(LegalDocumentType type) {
        return repository.findAll(type).stream()
                .map(v -> new LegalVersionSummary(v.version(), v.publishedAt(), v.requiresAcceptance(),
                        readSummary(v.changeSummary())))
                .toList();
    }

    @Override
    @Transactional
    public LegalDocumentResponse publish(Long actorUserId, LegalDocumentType type, PublishLegalRequest request) {
        LegalContent content = validator.validate(request.content());
        Map<String, String> summary = validator.validateChangeSummary(request.changeSummary());

        int latest = repository.findLatest(type).map(LegalVersion::version).orElse(0);
        if (request.baseVersion() != latest) {
            throw new ConflictException("A newer version (" + latest + ") was published while you were editing. "
                    + "Reload it and apply your changes again.");
        }

        LegalVersion saved;
        try {
            saved = repository.insertNext(type, write(content), summary == null ? null : write(summary),
                    request.requiresAcceptance(), actorUserId);
        } catch (DuplicateKeyException e) {
            throw new ConflictException("Another version was published at the same moment. Reload and try again.");
        }

        writeAuditLog(actorUserId, saved);
        if (saved.requiresAcceptance()) {
            notifications.legalDocumentUpdated(recipients.allActiveUsers(), type.name());
        }
        return toResponse(saved);
    }

    /** Deliberately not transactional: losing a race to another instance is fine, so a duplicate is ignored. */
    @Override
    public void seedIfMissing(LegalDocumentType type, LegalContent content) {
        if (repository.findLatest(type).isPresent()) {
            return;
        }
        try {
            repository.insertNext(type, write(validator.validate(content)), null, true, null);
            log.info("Seeded {} version 1", type);
        } catch (DuplicateKeyException ignored) {
            // another instance seeded it first
        }
    }

    private LegalDocumentResponse toResponse(LegalVersion version) {
        return new LegalDocumentResponse(version.type(), version.version(), version.publishedAt(),
                version.requiresAcceptance(), read(version.content(), LegalContent.class));
    }

    private Map<String, String> readSummary(String json) {
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, TEXT);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored change summary is not valid", e);
        }
    }

    private <T> T read(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored legal document is not valid", e);
        }
    }

    private String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialise legal document", e);
        }
    }

    private void writeAuditLog(Long actorUserId, LegalVersion saved) {
        AuditLog entry = new AuditLog();
        entry.setActorUserId(actorUserId);
        entry.setAction("LEGAL_PUBLISHED");
        entry.setDetails(saved.type() + " published as version " + saved.version()
                + (saved.requiresAcceptance() ? " (re-acceptance required)" : " (no re-acceptance)"));
        auditLogRepository.save(entry);
    }
}
