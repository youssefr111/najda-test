package com.najda.backend.kyc.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A webhook delivery we already processed (Didit retries, and a delivery can arrive twice). */
@Entity
@Table(name = "kyc_webhook_events")
@Getter
@NoArgsConstructor
public class KycWebhookEvent {

    @Id
    @Column(name = "event_id", length = 64)
    private String eventId;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt = Instant.now();

    public KycWebhookEvent(String eventId) {
        this.eventId = eventId;
    }
}
