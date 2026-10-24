package com.najda.backend.kyc.repository;

import com.najda.backend.kyc.model.KycWebhookEvent;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KycWebhookEventRepository extends JpaRepository<KycWebhookEvent, String> {

    @Modifying
    @Query("DELETE FROM KycWebhookEvent e WHERE e.receivedAt < :before")
    int deleteOlderThan(@Param("before") Instant before);
}
