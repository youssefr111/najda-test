package com.najda.backend.legal.service;

import com.najda.backend.legal.dto.AcceptConsentRequest;
import com.najda.backend.legal.dto.ConsentStatusResponse;
import com.najda.backend.legal.model.ConsentSource;

public interface LegalConsentService {

    /** What the person still has to accept (empty when they are up to date). */
    ConsentStatusResponse status(long userId);

    /**
     * Records the person's acceptance of the given versions.
     *
     * @throws com.najda.backend.exceptions.ConflictException a version is no longer the latest
     */
    ConsentStatusResponse accept(long userId, AcceptConsentRequest request);

    /** @throws LegalConsentRequiredException when something is still pending */
    void requireCurrentConsent(long userId);

    /**
     * Records that a person who has just registered accepted the latest documents: the sign-up form
     * requires agreeing to them. The client (web or mobile) is read from the current request.
     */
    void acceptLatest(long userId);

    /** Same, for accounts the system creates itself (pass {@link ConsentSource#SYSTEM}). */
    void acceptLatest(long userId, ConsentSource source);
}
