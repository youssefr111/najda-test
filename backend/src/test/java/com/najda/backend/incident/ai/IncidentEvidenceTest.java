package com.najda.backend.incident.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.najda.backend.incident.ai.IncidentEvidence.Item;
import com.najda.backend.incident.ai.IncidentEvidence.Kind;
import com.najda.backend.incident.model.IncidentCategory;
import com.najda.backend.incident.model.ReportedFor;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class IncidentEvidenceTest {

    private static IncidentEvidence of(Item... items) {
        return new IncidentEvidence(1L, IncidentCategory.MEDICAL, 0, ReportedFor.SELF, 30.0, 31.0,
                Instant.parse("2026-11-01T10:00:00Z"), List.of(items));
    }

    private static final Item MESSAGE = new Item(Kind.REPORTER_MESSAGE, "man collapsed in the street", true);

    @Test
    void placeholdersAreNotContent() {
        IncidentEvidence onlyPending = of(new Item(Kind.VOICE_NOTE, "[analysis in progress]", false));
        assertFalse(onlyPending.hasContent());
        assertTrue(of(MESSAGE).hasContent());
    }

    @Test
    void pendingTranscriptDoesNotChangeTheFingerprint() {
        // A run already in flight must not be discarded just because a recording started transcribing.
        String before = of(MESSAGE).fingerprint();
        String withPlaceholder = of(MESSAGE, new Item(Kind.VOICE_NOTE, "[analysis in progress]", false)).fingerprint();
        assertEquals(before, withPlaceholder);
    }

    @Test
    void finishedTranscriptChangesTheFingerprint() {
        String before = of(MESSAGE).fingerprint();
        String after = of(MESSAGE, new Item(Kind.VOICE_NOTE, "he is not breathing", true)).fingerprint();
        assertNotEquals(before, after);
    }

    @Test
    void narrativeLabelsEverySource() {
        String narrative = of(MESSAGE, new Item(Kind.VIDEO_AUDIO, "fire on the second floor", true)).narrative();
        assertTrue(narrative.contains("REPORTER WRITTEN MESSAGE"));
        assertTrue(narrative.contains("VIDEO AUDIO TRACK"));
        assertTrue(narrative.contains("fire on the second floor"));
    }

    @Test
    void photoDescriptionIsLabelledAndCounts() {
        IncidentEvidence evidence = of(new Item(Kind.PHOTO, "A car is on fire; two people stand nearby.", true));
        assertTrue(evidence.hasContent());
        assertTrue(evidence.narrative().contains("PHOTO"));
    }

    @Test
    void emptyEvidenceSaysSo() {
        assertEquals("(no message provided)", of().narrative());
    }
}
