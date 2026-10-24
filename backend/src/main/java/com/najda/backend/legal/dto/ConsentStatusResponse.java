package com.najda.backend.legal.dto;

import java.util.List;

/** Empty {@code pending} means the person has accepted everything they have to. */
public record ConsentStatusResponse(List<PendingConsent> pending) {
}
