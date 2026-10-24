package com.najda.backend.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.najda.backend.notification.model.NotificationType;
import com.najda.backend.notification.service.NotificationMessages;
import java.util.Map;
import org.junit.jupiter.api.Test;

class NotificationMessagesTest {

    private static final Map<String, String> PARAMS = Map.of(
            "id", "42", "category", "FIRE", "unit", "AMB-101", "sender", "Sara", "hospital", "Cairo University Hospital");

    @Test
    void everyNotificationTypeHasEnglishAndArabicText() {
        for (NotificationType type : NotificationType.values()) {
            for (String language : new String[] {"en", "ar"}) {
                assertFalse(NotificationMessages.title(type, PARAMS).get(language).isBlank(), type + " title " + language);
                assertFalse(NotificationMessages.body(type, PARAMS).get(language).isBlank(), type + " body " + language);
            }
        }
    }

    @Test
    void textUsesTheProvidedDetails() {
        var title = NotificationMessages.title(NotificationType.INCIDENT_NEW, PARAMS);
        assertTrue(title.get("en").contains("fire"));
        assertTrue(title.get("ar").contains("حريق"));
        assertTrue(NotificationMessages.body(NotificationType.MISSION_REJECTED, PARAMS).get("en").contains("AMB-101"));
        assertTrue(NotificationMessages.body(NotificationType.INCIDENT_NEW, PARAMS).get("en").contains("#42"));
    }

    @Test
    void missingDetailsStillProduceReadableText() {
        var body = NotificationMessages.body(NotificationType.MISSION_REJECTED, Map.of());
        assertFalse(body.get("en").contains("null"));
        assertFalse(body.get("ar").contains("null"));
    }

    @Test
    void pickChoosesTheLanguageAndFallsBackToEnglish() {
        var text = Map.of("en", "Hello", "ar", "مرحبا");
        assertEquals("مرحبا", NotificationMessages.pick(text, "ar"));
        assertEquals("مرحبا", NotificationMessages.pick(text, "ar-EG"));
        assertEquals("Hello", NotificationMessages.pick(text, "en-US"));
        assertEquals("Hello", NotificationMessages.pick(text, null));
        assertEquals("Hello", NotificationMessages.pick(Map.of("en", "Hello"), "ar"));
    }

    @Test
    void onlyTimeCriticalTypesAreUrgent() {
        assertTrue(NotificationType.MISSION_OFFERED.isUrgent());
        assertTrue(NotificationType.INCIDENT_NEW.isUrgent());
        assertFalse(NotificationType.CHAT_MESSAGE.isUrgent());
        assertFalse(NotificationType.INCIDENT_RESOLVED.isUrgent());
    }
}
