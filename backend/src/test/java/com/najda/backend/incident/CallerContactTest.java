package com.najda.backend.incident;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.najda.backend.incident.dto.CallerContactResponse;
import com.najda.backend.incident.service.CallerContactServiceImpl;
import com.najda.backend.user.model.User;
import org.junit.jupiter.api.Test;

class CallerContactTest {

    private static User caller(String phone, boolean verified) {
        User user = new User();
        user.setPhone(phone);
        user.setPhoneVerified(verified);
        return user;
    }

    @Test
    void handsOutAVerifiedNumber() {
        CallerContactResponse contact = CallerContactServiceImpl.contactOf(caller("+201001234567", true));
        assertEquals("+201001234567", contact.phone());
        assertTrue(contact.phoneVerified());
    }

    @Test
    void neverHandsOutAnUnverifiedNumber() {
        CallerContactResponse contact = CallerContactServiceImpl.contactOf(caller("+201001234567", false));
        assertNull(contact.phone());
        assertFalse(contact.phoneVerified());
    }

    @Test
    void hasNothingToShowWithoutANumber() {
        assertNull(CallerContactServiceImpl.contactOf(caller(null, true)).phone());
        assertNull(CallerContactServiceImpl.contactOf(caller("   ", true)).phone());
    }

    @Test
    void trimsTheNumber() {
        assertEquals("+201001234567", CallerContactServiceImpl.contactOf(caller(" +201001234567 ", true)).phone());
    }
}