package com.najda.backend.guidance.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.audit.model.AuditLog;
import com.najda.backend.audit.repository.AuditLogRepository;
import com.najda.backend.content.ContentDocument;
import com.najda.backend.content.ContentDocumentRepository;
import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.exceptions.ResourceNotFoundException;
import com.najda.backend.guidance.dto.GuidanceContent;
import com.najda.backend.guidance.dto.GuidanceResponse;
import com.najda.backend.guidance.dto.UpdateGuidanceRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GuidanceServiceImpl implements GuidanceService {

    static final String DOCUMENT_KEY = "guidance";

    private final ContentDocumentRepository documents;
    private final GuidanceValidator validator;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public GuidanceServiceImpl(ContentDocumentRepository documents, GuidanceValidator validator,
                               AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.documents = documents;
        this.validator = validator;
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public GuidanceResponse get() {
        return toResponse(documents.find(DOCUMENT_KEY)
                .orElseThrow(() -> new ResourceNotFoundException("Guidance content has not been set up")));
    }

    @Override
    @Transactional
    public GuidanceResponse update(Long actorUserId, UpdateGuidanceRequest request) {
        GuidanceContent content = validator.validate(request.content());

        ContentDocument saved = documents
                .replace(DOCUMENT_KEY, write(content), request.baseVersion(), actorUserId)
                .orElseThrow(() -> new ConflictException(
                        "Someone else saved the guidance while you were editing. Reload it and apply your changes again."));

        writeAuditLog(actorUserId, saved.version(), content);
        return toResponse(saved);
    }

    @Override
    public void seedIfMissing(GuidanceContent content) {
        documents.insertIfAbsent(DOCUMENT_KEY, write(validator.validate(content)));
    }

    private GuidanceResponse toResponse(ContentDocument document) {
        return new GuidanceResponse(document.version(), document.updatedAt(), read(document.json()));
    }

    private String write(GuidanceContent content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialise guidance content", e);
        }
    }

    private GuidanceContent read(String json) {
        try {
            return objectMapper.readValue(json, GuidanceContent.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored guidance content is not valid", e);
        }
    }

    private void writeAuditLog(Long actorUserId, long version, GuidanceContent content) {
        int cards = content.categories().stream().mapToInt(category -> category.cards().size()).sum();
        AuditLog entry = new AuditLog();
        entry.setActorUserId(actorUserId);
        entry.setAction("GUIDANCE_UPDATED");
        entry.setDetails("Guidance saved as version " + version + " (" + content.categories().size()
                + " categories, " + cards + " cards)");
        auditLogRepository.save(entry);
    }
}
