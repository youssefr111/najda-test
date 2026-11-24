package com.najda.backend.notification.model;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A device (phone or browser) registered to receive push notifications. */
@Entity
@Table(name = "device_tokens")
@Getter
@Setter
@NoArgsConstructor
public class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, unique = true, length = 512)
    private String token;

    /** ANDROID, IOS or WEB. */
    @Column(nullable = false, length = 10)
    private String platform;

    /** The app language on that device ("en" / "ar"): the push is written in it. */
    @Column(nullable = false, length = 10)
    private String locale = "en";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt = Instant.now();
}
