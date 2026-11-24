package com.najda.backend.appversion.service;

import java.util.Arrays;
import java.util.Optional;

/** Which stream of app builds a caller wants the newest release of. */
public enum ReleaseChannel {

    /** Published releases ({@code v1.2.0}); GitHub's "latest release" already skips drafts and pre-releases. */
    PRODUCTION("production", "latest"),

    /** The rolling pre-release that the test workflow recreates on every run. */
    TEST("test", "tags/test-latest");

    private final String id;
    private final String apiPath;

    ReleaseChannel(String id, String apiPath) {
        this.id = id;
        this.apiPath = apiPath;
    }

    /** The path below {@code /repos/{owner}/{name}/releases/} that returns this channel's release. */
    public String apiPath() {
        return apiPath;
    }

    /** Looks a channel up by its request-parameter value ({@code "production"}, {@code "test"}). */
    public static Optional<ReleaseChannel> fromId(String id) {
        return Arrays.stream(values()).filter(channel -> channel.id.equals(id)).findFirst();
    }
}