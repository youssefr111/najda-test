package com.najda.backend.notification.dto;

import com.najda.backend.notification.model.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class NotificationDtos {

    private NotificationDtos() {}

    /** Title/body carry every supported language; the client picks the user's. */
    public record NotificationResponse(
            Long id,
            NotificationType type,
            Map<String, String> title,
            Map<String, String> body,
            Map<String, String> data,
            Instant createdAt,
            boolean read) {}

    /** A page of notifications, newest first. Pass {@code nextBefore} as {@code before} for the next page. */
    public record NotificationPage(List<NotificationResponse> items, Long nextBefore, long unreadCount) {}

    public record UnreadCountResponse(long unreadCount) {}

    public record RegisterDeviceRequest(
            @NotBlank @Size(max = 512) String token,
            @NotBlank @Pattern(regexp = "ANDROID|IOS|WEB") String platform,
            @Size(max = 10) String locale) {}
}
