package com.najda.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.najda.backend.security.configuration.CorsProperties;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class CorsPropertiesTest {

    private static CorsProperties of(String... origins) {
        return new CorsProperties(List.of(origins), Duration.ofHours(1));
    }

    @Test
    void trimsStripsTrailingSlashAndDeduplicates() {
        assertEquals(List.of("https://app.example.com", "http://localhost:3000"),
                of(" https://app.example.com/ ", "https://app.example.com", "http://localhost:3000").allowedOrigins());
    }

    @Test
    void emptyMeansNoBrowserOrigin() {
        assertEquals(List.of(), of("", "  ").allowedOrigins());
    }

    @Test
    void acceptsPreviewSubdomainWildcard() {
        assertEquals(List.of("https://najda-*.vercel.app"), of("https://najda-*.vercel.app").allowedOrigins());
    }

    @Test
    void rejectsBareWildcardPathsAndGarbage() {
        assertThrows(IllegalArgumentException.class, () -> of("*"));
        assertThrows(IllegalArgumentException.class, () -> of("https://*"));
        assertThrows(IllegalArgumentException.class, () -> of("https://app.example.com/app"));
        assertThrows(IllegalArgumentException.class, () -> of("app.example.com"));
    }
}