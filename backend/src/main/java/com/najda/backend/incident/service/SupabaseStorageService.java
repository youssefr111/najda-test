package com.najda.backend.incident.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Talks to Supabase Storage's REST API directly -- no official Java SDK,
 * so this mirrors the plain HttpClient pattern already used elsewhere in
 * this build. Bucket is PRIVATE: nothing here ever returns a public URL --
 * only bucket-relative paths (stored) and short-lived signed URLs
 * (generated on demand, for both upload and download).
 */
@Service
public class SupabaseStorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);
    private static final int DEFAULT_DOWNLOAD_EXPIRY_SECONDS = 300;
    private static final int MAX_DOWNLOAD_EXPIRY_SECONDS = 3600;

    // Shared across incident evidence and (new) first-responder application
    // documents -- a citizen attaching a PDF to either isn't a real risk,
    // so one allowlist is simpler than maintaining two.
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "mp4", "webm", "mov", "mp3", "wav", "m4a", "ogg", "pdf", "doc", "docx"
    );

    // Top-level folders this service will ever issue or accept paths under.
    private static final Set<String> ALLOWED_FOLDERS = Set.of("incidents", "applications");

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(REQUEST_TIMEOUT).build();
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${SUPABASE_URL}")
    private String supabaseUrl;

    @Value("${SUPABASE_SERVICE_ROLE_KEY}")
    private String serviceRoleKey;

    @Value("${SUPABASE_STORAGE_BUCKET}")
    private String bucket;

    public record SignedUpload(String uploadUrl, String path) {}

    /** Server-side upload using the service-role key -- still supported
        for the legacy multipart endpoint, but returns a path now, never
        a public URL, matching every other method here. */
    public String upload(String path, byte[] bytes, String contentType) throws Exception {
        validateOwnedPath(path);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/storage/v1/object/" + bucket + "/" + path))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .header("Content-Type", contentType != null && !contentType.isBlank() ? contentType : "application/octet-stream")
                .POST(HttpRequest.BodyPublishers.ofByteArray(bytes))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Supabase upload failed: HTTP " + response.statusCode() + " - " + response.body());
        }
        return path;
    }

    /** Generic signed-upload-URL creation under any allowed folder --
        incident media and first-responder application documents both
        call this, just with a different folder prefix. */
    public SignedUpload createSignedUploadUrl(String folder, String fileExtension) throws Exception {
        if (folder == null || folder.isBlank()) {
            throw new IllegalArgumentException("A storage folder is required");
        }
        String extension = normalizeExtension(fileExtension);
        String path = folder + "/" + UUID.randomUUID() + "." + extension;
        validateOwnedPath(path);

        String endpoint = supabaseUrl + "/storage/v1/object/upload/sign/" + bucket + "/" + path;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("Supabase signed-upload request failed: HTTP {} - {}", response.statusCode(), response.body());
            throw new IllegalStateException("Supabase signed-upload request failed: HTTP " + response.statusCode() + " - " + response.body());
        }

        JsonNode body = mapper.readTree(response.body());
        JsonNode urlNode = body.get("url");
        if (urlNode == null || urlNode.isNull() || urlNode.asText().isBlank()) {
            throw new IllegalStateException("Supabase did not return a signed upload URL: " + response.body());
        }

        String uploadUrl = supabaseUrl + "/storage/v1" + urlNode.asText();
        return new SignedUpload(uploadUrl, path);
    }

    /** Convenience overload for incident evidence -- keeps every existing
        call site (IncidentMediaServiceImpl) unchanged. */
    public SignedUpload createSignedUploadUrl(Long incidentId, String fileExtension) throws Exception {
        if (incidentId == null || incidentId <= 0) {
            throw new IllegalArgumentException("Valid incident ID is required");
        }
        return createSignedUploadUrl("incidents/" + incidentId, fileExtension);
    }

    public String createSignedDownloadUrl(String path) throws Exception {
        return createSignedDownloadUrl(path, DEFAULT_DOWNLOAD_EXPIRY_SECONDS);
    }

    public String createSignedDownloadUrl(String path, int expiresInSeconds) throws Exception {
        validateOwnedPath(path);
        if (expiresInSeconds <= 0 || expiresInSeconds > MAX_DOWNLOAD_EXPIRY_SECONDS) {
            throw new IllegalArgumentException("Download URL expiration must be between 1 and " + MAX_DOWNLOAD_EXPIRY_SECONDS + " seconds");
        }

        String endpoint = supabaseUrl + "/storage/v1/object/sign/" + bucket + "/" + path;
        String requestBody = """
                {"expiresIn": %d}
                """.formatted(expiresInSeconds);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Supabase signed-download request failed: HTTP " + response.statusCode() + " - " + response.body());
        }

        JsonNode body = mapper.readTree(response.body());
        JsonNode signedUrlNode = body.get("signedURL");
        if (signedUrlNode == null || signedUrlNode.isNull() || signedUrlNode.asText().isBlank()) {
            throw new IllegalStateException("Supabase did not return a signed download URL: " + response.body());
        }
        return supabaseUrl + "/storage/v1" + signedUrlNode.asText();
    }

    public boolean isOwnedPath(String path) {
        if (path == null || path.isBlank()) return false;
        if (path.startsWith("/") || path.contains("..") || path.contains("\\")) return false;
        String[] parts = path.split("/", 2);
        return parts.length == 2 && ALLOWED_FOLDERS.contains(parts[0]);
    }

    private void validateOwnedPath(String path) {
        if (!isOwnedPath(path)) {
            throw new IllegalArgumentException("Invalid storage path");
        }
    }

    public boolean objectExists(String path) throws Exception {
        validateOwnedPath(path);
        String url = supabaseUrl + "/storage/v1/object/" + bucket + "/" + path;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .method("HEAD", HttpRequest.BodyPublishers.noBody())
                .build();

        HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
        return response.statusCode() == 200;
    }

    public void deleteObject(String path) throws Exception {
        validateOwnedPath(path);
        String jsonBody = mapper.writeValueAsString(java.util.Map.of("prefixes", java.util.List.of(path)));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/storage/v1/object/" + bucket))
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .header("Content-Type", "application/json")
                .method("DELETE", HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Supabase delete failed: HTTP " + response.statusCode() + " - " + response.body());
        }
    }

    private String normalizeExtension(String fileExtension) {
        if (fileExtension == null || fileExtension.isBlank()) {
            throw new IllegalArgumentException("File extension is required");
        }
        String extension = fileExtension.trim().toLowerCase().replace(".", "");
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file extension: " + extension);
        }
        return extension;
    }
}