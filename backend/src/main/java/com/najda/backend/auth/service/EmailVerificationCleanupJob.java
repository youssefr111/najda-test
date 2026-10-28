package com.najda.backend.auth.service;

import com.najda.backend.auth.repository.EmailVerificationRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailVerificationCleanupJob {

    private final EmailVerificationRepository repository;
    private final Clock clock;

    @Scheduled(fixedDelay = 15, timeUnit = TimeUnit.MINUTES)
    @Transactional
    public void purgeStale() {
        int deleted = repository.deleteStale(Instant.now(clock));
        if (deleted > 0) {
            log.debug("Purged {} stale email verification records", deleted);
        }
    }
}