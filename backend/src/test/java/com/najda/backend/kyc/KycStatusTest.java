package com.najda.backend.kyc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.najda.backend.kyc.model.KycStatus;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class KycStatusTest {

    @Test
    void mapsDiditsExactStatusLabels() {
        assertEquals(Optional.of(KycStatus.VERIFIED), KycStatus.fromDidit("Approved"));
        assertEquals(Optional.of(KycStatus.DECLINED), KycStatus.fromDidit("Declined"));
        assertEquals(Optional.of(KycStatus.IN_REVIEW), KycStatus.fromDidit("In Review"));
        assertEquals(Optional.of(KycStatus.IN_PROGRESS), KycStatus.fromDidit("In Progress"));
        assertEquals(Optional.of(KycStatus.IN_PROGRESS), KycStatus.fromDidit("Not Started"));
        assertEquals(Optional.of(KycStatus.IN_PROGRESS), KycStatus.fromDidit("Resubmitted"));
        assertEquals(Optional.of(KycStatus.ABANDONED), KycStatus.fromDidit("Abandoned"));
        assertEquals(Optional.of(KycStatus.EXPIRED), KycStatus.fromDidit("Expired"));
        assertEquals(Optional.of(KycStatus.EXPIRED), KycStatus.fromDidit("Kyc Expired"));
    }

    @Test
    void labelsAreCaseSensitiveAndUnknownOnesAreIgnored() {
        assertEquals(Optional.empty(), KycStatus.fromDidit("approved"));
        assertEquals(Optional.empty(), KycStatus.fromDidit("Awaiting User"));
        assertEquals(Optional.empty(), KycStatus.fromDidit(null));
    }

    @Test
    void settledMeansFinishedOneWayOrTheOther() {
        assertTrue(KycStatus.VERIFIED.isSettled());
        assertTrue(KycStatus.DECLINED.isSettled());
        assertFalse(KycStatus.IN_PROGRESS.isSettled());
        assertFalse(KycStatus.IN_REVIEW.isSettled());
        assertFalse(KycStatus.NOT_STARTED.isSettled());
    }
}
