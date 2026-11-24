package com.najda.backend.appversion.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.appversion.config.AppReleaseProperties;
import com.najda.backend.appversion.service.ReleaseVersions.ApkAsset;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Comparator;
import java.util.Optional;
import java.util.stream.StreamSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Reads a channel's newest release from the public GitHub API.
 * Anonymous access allows 60 calls an hour per IP; with a token it is 5,000.
 * The cache in front of this makes about eight.
 */
@Component
public class GithubReleaseClient implements LatestReleaseSource {

    private static final Logger log = LoggerFactory.getLogger(GithubReleaseClient.class);

    private final String repository;
    private final String token;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public GithubReleaseClient(AppReleaseProperties properties, ObjectMapper mapper) {
        this.repository = properties.repository();
        this.token = properties.token();
        this.mapper = mapper;
    }

    @SuppressWarnings("null")
    @Override
    public Optional<ReleaseInfo> fetchLatest(ReleaseChannel channel) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(
                        URI.create("https://api.github.com/repos/" + repository + "/releases/" + channel.apiPath()))
                .timeout(Duration.ofSeconds(8))
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("User-Agent", "najda-backend")
                .GET();
        if (!token.isEmpty()) builder.header("Authorization", "Bearer " + token);
        HttpRequest request = builder.build();

        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 404) return Optional.empty(); // nothing published yet
            if (status / 100 != 2) throw new ReleaseLookupException("GitHub answered HTTP " + status);

            Optional<ReleaseInfo> info = toReleaseInfo(channel, mapper.readTree(response.body()));
            if (info.isEmpty()) {
                log.warn("Ignoring the {} release of {}: it carries no usable version", channel, repository);
            }
            return info;
        } catch (IOException e) {
            throw new ReleaseLookupException("Could not reach GitHub", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ReleaseLookupException("Interrupted while contacting GitHub", e);
        }
    }

    /**
     * Maps GitHub's release JSON to what the app needs: version, build, and the newest APK's direct download link and
     * size. Empty when the release carries no usable version or page.
     */
    @SuppressWarnings("null")
    public static Optional<ReleaseInfo> toReleaseInfo(ReleaseChannel channel, JsonNode release) {
        Optional<ApkFile> apkFile = newestApk(release);
        Optional<ApkAsset> apk = apkFile.map(ApkFile::apk);
        Optional<String> version = versionOf(channel, release, apk);
        String url = release.path("html_url").asText("");
        if (version.isEmpty() || url.isBlank()) return Optional.empty();

        // Only an https link is passed on: it is what the phone opens when the person taps "Update".
        String apkUrl = apkFile
                .map(file -> file.node().path("browser_download_url").asText(""))
                .filter(link -> link.startsWith("https://"))
                .orElse(null);
        long size = apkFile.map(file -> file.node().path("size").asLong(0)).orElse(0L);
        return Optional.of(new ReleaseInfo(
                version.get(), apk.map(ApkAsset::build).orElse(null), url, apkUrl, size > 0 ? size : null));
    }

    /** Production versions live in the tag; the test release's tag is fixed, so its APK file names carry the version. */
    @SuppressWarnings("null")
    private static Optional<String> versionOf(ReleaseChannel channel, JsonNode release, Optional<ApkAsset> apk) {
        return switch (channel) {
            case PRODUCTION -> ReleaseVersions.fromTag(release.path("tag_name").asText(""));
            case TEST -> apk.map(ApkAsset::version);
        };
    }

    /**
     * The APK with the highest build number ({@code najda-v1.0.0-build142.apk}). A rebuilt release can hold the old and
     * the new APK side by side, and the newer one has the higher number.
     */
    @SuppressWarnings("null")
    private static Optional<ApkFile> newestApk(JsonNode release) {
        return StreamSupport.stream(release.path("assets").spliterator(), false)
                .map(asset -> ReleaseVersions.parseApk(asset.path("name").asText(""))
                        .map(apk -> new ApkFile(apk, asset)))
                .flatMap(Optional::stream)
                .max(Comparator.comparingInt(file -> file.apk().build()));
    }

    /** An APK asset: its parsed file name, and GitHub's JSON for it (download link, size). */
    private record ApkFile(ApkAsset apk, JsonNode node) {}
}