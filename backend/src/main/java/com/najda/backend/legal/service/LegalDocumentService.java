package com.najda.backend.legal.service;

import com.najda.backend.legal.dto.LegalContent;
import com.najda.backend.legal.dto.LegalDocumentResponse;
import com.najda.backend.legal.dto.LegalVersionSummary;
import com.najda.backend.legal.dto.PublishLegalRequest;
import com.najda.backend.legal.model.LegalDocumentType;
import java.util.List;

public interface LegalDocumentService {

    /** The version currently in force. */
    LegalDocumentResponse getLatest(LegalDocumentType type);

    LegalDocumentResponse getVersion(LegalDocumentType type, int version);

    /** Revision history, newest first. */
    List<LegalVersionSummary> listVersions(LegalDocumentType type);

    /**
     * Publishes a new immutable version.
     *
     * @throws LegalValidationException the content is incomplete or malformed
     * @throws com.najda.backend.exceptions.ConflictException another version was published since the editor loaded
     */
    LegalDocumentResponse publish(Long actorUserId, LegalDocumentType type, PublishLegalRequest request);

    /** Version 1, but only when the document has no version yet. Used by the startup seeder. */
    void seedIfMissing(LegalDocumentType type, LegalContent content);
}
