package com.najda.backend.kyc.dto;

import com.najda.backend.kyc.model.KycStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminKycRequest(@NotNull KycStatus status, @Size(max = 200) String note) {}
