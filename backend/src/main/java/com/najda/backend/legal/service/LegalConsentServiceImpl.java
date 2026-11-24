package com.najda.backend.legal.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.exceptions.ConflictException;
import com.najda.backend.legal.dto.AcceptConsentRequest;
import com.najda.backend.legal.dto.ConsentStatusResponse;
import com.najda.backend.legal.dto.LegalContent;
import com.najda.backend.legal.dto.PendingConsent;
import com.najda.backend.legal.model.ConsentSource;
import com.najda.backend.legal.model.LegalDocumentType;
import com.najda.backend.legal.model.LegalVersion;
import com.najda.backend.legal.repository.LegalRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * A person is up to date with a document when they have accepted a version at least as new as the
 * latest <em>material</em> one. Accepting the newest version always satisfies that, and a small
 * correction published without re-acceptance never bothers anyone.
 */
@Service
public class LegalConsentServiceImpl implements LegalConsentService {

    private static final TypeReference<Map<String, String>> TEXT = new TypeReference<>() { };

    private final LegalRepository repository;
    private final ObjectMapper objectMapper;

    public LegalConsentServiceImpl(LegalRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public ConsentStatusResponse status(long userId) {
        Map<LegalDocumentType, Integer> accepted = repository.findHighestAcceptedVersions(userId);
        List<PendingConsent> pending = new ArrayList<>();

        for (LegalDocumentType type : LegalDocumentType.values()) {
            LegalVersion latest = repository.findLatest(type).orElse(null);
            Integer material = repository.findLatestMaterialVersion(type).orElse(null);
            if (latest == null || material == null) {
                continue;
            }
            Integer mine = accepted.get(type);
            if (mine == null || mine < material) {
                pending.add(new PendingConsent(type, latest.id(), latest.version(), titleOf(latest),
                        summaryOf(latest), latest.publishedAt()));
            }
        }
        return new ConsentStatusResponse(pending);
    }

    @Override
    @Transactional
    public ConsentStatusResponse accept(long userId, AcceptConsentRequest request) {
        if (request.source() == ConsentSource.SYSTEM) {
            throw new IllegalArgumentException("Invalid source");
        }
        Set<Long> latestIds = new HashSet<>();
        for (LegalDocumentType type : LegalDocumentType.values()) {
            repository.findLatest(type).ifPresent(latest -> latestIds.add(latest.id()));
        }
        if (!latestIds.containsAll(request.versionIds())) {
            throw new ConflictException("A newer version has been published. Please review it before accepting.");
        }

        repository.insertAcceptances(userId, request.versionIds(), request.source());
        return status(userId);
    }

    @Override
    @Transactional
    public void acceptLatest(long userId) {
        acceptLatest(userId, currentClient());
    }

    @Override
    @Transactional
    public void acceptLatest(long userId, ConsentSource source) {
        List<Long> latestIds = new ArrayList<>();
        for (LegalDocumentType type : LegalDocumentType.values()) {
            repository.findLatest(type).ifPresent(latest -> latestIds.add(latest.id()));
        }
        repository.insertAcceptances(userId, latestIds, source);
    }

    @Override
    @Transactional(readOnly = true)
    public void requireCurrentConsent(long userId) {
        if (!status(userId).pending().isEmpty()) {
            throw new LegalConsentRequiredException();
        }
    }

    private Map<String, String> titleOf(LegalVersion version) {
        try {
            return objectMapper.readValue(version.content(), LegalContent.class).title();
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored legal document is not valid", e);
        }
    }

    private Map<String, String> summaryOf(LegalVersion version) {
        if (version.changeSummary() == null) {
            return null;
        }
        try {
            return objectMapper.readValue(version.changeSummary(), TEXT);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored change summary is not valid", e);
        }
    }

    /** Mobile sends {@code X-Client-Platform: mobile}; the web app sends nothing, so the default is WEB. */
    private ConsentSource currentClient() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            String platform = attributes.getRequest().getHeader("X-Client-Platform");
            if ("mobile".equalsIgnoreCase(platform)) {
                return ConsentSource.MOBILE;
            }
        }
        return ConsentSource.WEB;
    }
}
