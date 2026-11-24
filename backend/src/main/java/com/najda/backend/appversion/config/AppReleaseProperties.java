package com.najda.backend.appversion.config;

import java.time.Duration;
import java.util.regex.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Where the mobile app's "a newer version exists" answer comes from ({@code najda.app-release.*}).
 *
 * @param repository   GitHub repository whose releases are the app versions, as {@code owner/name}.
 * @param cacheTtl     how long a successful answer is reused before GitHub is asked again.
 * @param errorBackoff how long to wait before retrying after GitHub failed, so an outage is not hammered.
 * @param token        optional GitHub token. Anonymous calls share a small rate limit per IP address, which hosted
 *                     platforms exhaust; a token gets its own. Blank means anonymous.
 */
@ConfigurationProperties(prefix = "najda.app-release")
public record AppReleaseProperties(
        @DefaultValue("youssefry01/najda") String repository,
        @DefaultValue("15m") Duration cacheTtl,
        @DefaultValue("1m") Duration errorBackoff,
        @DefaultValue("") String token) {

    private static final Pattern REPOSITORY = Pattern.compile("[\\w.-]+/[\\w.-]+");

    public AppReleaseProperties {
        if (repository == null || !REPOSITORY.matcher(repository).matches()) {
            throw new IllegalArgumentException("najda.app-release.repository must look like \"owner/name\"");
        }
        token = token == null ? "" : token.strip();
    }
}