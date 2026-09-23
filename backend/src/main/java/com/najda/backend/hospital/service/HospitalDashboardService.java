package com.najda.backend.hospital.service;

import com.najda.backend.hospital.dto.IncomingTransferResponse;
import java.util.List;

public interface HospitalDashboardService {

    /** Transfers currently inbound to the caller's own hospital --
        SELECTED or EN_ROUTE only; ARRIVED transfers have already
        completed and belong in history, not an "incoming" view. */
    List<IncomingTransferResponse> getIncomingTransfers(Long staffUserId);
}