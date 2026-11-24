package com.najda.backend.notification.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One notification for one recipient (the in-app inbox row). */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class UserNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    /** {"en": "...", "ar": "..."} */
    @Convert(converter = JsonMapConverter.class)
    @Column(nullable = false, columnDefinition = "text")
    private Map<String, String> title;

    @Convert(converter = JsonMapConverter.class)
    @Column(nullable = false, columnDefinition = "text")
    private Map<String, String> body;

    /** Ids the client needs to open the right screen: incidentId, missionId, ... */
    @Convert(converter = JsonMapConverter.class)
    @Column(nullable = false, columnDefinition = "text")
    private Map<String, String> data;

    @Column(name = "incident_id")
    private Long incidentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "read_at")
    private Instant readAt;
}
