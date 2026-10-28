package com.najda.backend.appversion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.appversion.config.AppReleaseProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Reads the repository's latest release from the public GitHub API. {@code /releases/latest} already skips drafts and
 * pre-releases. Anonymous access allows 60 calls an hour; the cache in front of this makes about four.
 */
@Component
public class GithubReleaseClient implements LatestReleaseSource {

    private static final Logger log = LoggerFactory.getLogger(GithubReleaseClient.class);

    private final String repository;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public GithubReleaseClient(AppReleaseProperties properties, ObjectMapper mapper) {
        this.repository = properties.repository();
        this.mapper = mapper;
    }

    /**
     * The highest build number among the release's APK files ({@code najda-v1.0.0-build142.apk}). A rebuilt release can
     * hold the old and the new APK side by side, and the newer one has the higher number.
     */
    private static Integer newestBuild(JsonNode release) {
        Integer newest = null;
        for (JsonNode asset : release.path("assets")) {
            Optional<Integer> build = ReleaseVersions.buildFromAssetName(asset.path("name").asText(""));
            if (build.isPresent() && (newest == null || build.get() > newest)) newest = build.get();
        }
        return newest;
    }

    @Override
    public Optional<ReleaseInfo> fetchLatest() {
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create("https://api.github.com/repos/" + repository + "/releases/latest"))
                .timeout(Duration.ofSeconds(8))
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("User-Agent", "najda-backend")
                .GET()
                .build();

        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 404) return Optional.empty(); // nothing published yet
            if (status / 100 != 2) throw new ReleaseLookupException("GitHub answered HTTP " + status);

            JsonNode release = mapper.readTree(response.body());
            String tag = release.path("tag_name").asText("").strip();
            Optional<String> version = ReleaseVersions.fromTag(tag);
            if (version.isEmpty()) {
                log.warn("Ignoring the latest release of {}: tag \"{}\" is not a plain version", repository, tag);
                return Optional.empty();
            }
            // The tag matched the strict pattern above, so it is safe to put in a URL.
            String url = "https://github.com/" + repository + "/releases/tag/" + tag;
            return Optional.of(new ReleaseInfo(version.get(), newestBuild(release), url));
        } catch (IOException e) {
            throw new ReleaseLookupException("Could not reach GitHub", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ReleaseLookupException("Interrupted while contacting GitHub", e);
        }
    }
}