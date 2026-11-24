package com.najda.backend.security.configuration;

import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Which browser origins may call the API and open the WebSocket ({@code najda.cors.*}).
 * Mobile apps and server-to-server calls are not subject to CORS, so they are unaffected.
 *
 * @param allowedOrigins exact origins: scheme + host [+ port], no path (e.g. {@code https://app.example.com}).
 *                       A wildcard inside the host is accepted for preview deployments
 *                       ({@code https://najda-*.vercel.app}); a bare {@code *} never is. Empty allows no browser origin.
 * @param maxAge         how long a browser may cache a preflight answer.
 */
@ConfigurationProperties(prefix = "najda.cors")
public record CorsProperties(
        @DefaultValue List<String> allowedOrigins,
        @DefaultValue("1h") Duration maxAge) {

    private static final Pattern ORIGIN = Pattern.compile("https?://[A-Za-z0-9*.-]+(:\\d{1,5})?");
    private static final Pattern EVERYTHING = Pattern.compile("https?://\\*+(:\\d{1,5})?");

    @SuppressWarnings("null")
    public CorsProperties {
        allowedOrigins = allowedOrigins.stream()
                .map(String::strip)
                .map(o -> o.endsWith("/") ? o.substring(0, o.length() - 1) : o)
                .filter(o -> !o.isEmpty())
                .distinct()
                .toList();
        for (String origin : allowedOrigins) {
            if (!ORIGIN.matcher(origin).matches() || EVERYTHING.matcher(origin).matches()) {
                throw new IllegalArgumentException("najda.cors.allowed-origins: \"" + origin
                        + "\" is not an allowed origin (expected e.g. https://app.example.com, no path, never a bare *)");
            }
        }
    }
}