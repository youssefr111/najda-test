package com.najda.backend.security.util;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/** Throwaway password satisfying Firebase's Password Policy -- never meant
    to be used, the employee sets their real one via the reset link. Shared
    by AuthServiceImpl and SystemUserInitializer so the compliance rules
    live in exactly one place. */
@Component
public class TemporaryPasswordGenerator {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public String generate() {
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghijkmnpqrstuvwxyz";
        String digits = "23456789";
        String special = "!@#$%^&*";
        String all = upper + lower + digits + special;

        StringBuilder password = new StringBuilder();
        password.append(upper.charAt(SECURE_RANDOM.nextInt(upper.length())));
        password.append(lower.charAt(SECURE_RANDOM.nextInt(lower.length())));
        password.append(digits.charAt(SECURE_RANDOM.nextInt(digits.length())));
        password.append(special.charAt(SECURE_RANDOM.nextInt(special.length())));
        for (int i = 0; i < 16; i++) password.append(all.charAt(SECURE_RANDOM.nextInt(all.length())));

        char[] chars = password.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = SECURE_RANDOM.nextInt(i + 1);
            char temp = chars[i]; chars[i] = chars[j]; chars[j] = temp;
        }
        return new String(chars);
    }
}