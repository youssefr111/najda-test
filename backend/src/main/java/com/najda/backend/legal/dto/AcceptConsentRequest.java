package com.najda.backend.legal.dto;

import com.najda.backend.legal.model.ConsentSource;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/** @param versionIds the {@code versionId}s from the pending list the person agreed to */
public record AcceptConsentRequest(@NotEmpty List<Long> versionIds, @NotNull ConsentSource source) {
}
