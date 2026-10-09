package com.najda.backend.security.ratelimit;

import com.najda.backend.exceptions.TooManyRequestsException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Fixed-window rate limiter keyed by an arbitrary string (e.g. "otp-send:ip:1.2.3.4").
 *
 * State lives in memory, so limits are per application instance. If the
 * backend is ever scaled horizontally, swap this for a shared store (Redis)
 * behind the same {@link #check} contract.
 */
@Component
@RequiredArgsConstructor
public class InMemoryRateLimiter {

    private record Window(Instant resetAt, int count) {}

    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** @throws TooManyRequestsException once {@code key} exceeds {@code maxRequests} within {@code window}. */
    public void check(String key, int maxRequests, Duration window) {
        Instant now = clock.instant();

        Window updated = windows.compute(key, (k, existing) ->
                existing == null || !now.isBefore(existing.resetAt())
                        ? new Window(now.plus(window), 1)
                        : new Window(existing.resetAt(), existing.count() + 1));

        if (updated.count() > maxRequests) {
            throw new TooManyRequestsException(
                    "Too many requests. Please try again later.",
                    Duration.between(now, updated.resetAt()));
        }
    }

    @Scheduled(fixedDelay = 5, timeUnit = TimeUnit.MINUTES)
    public void purgeExpired() {
        Instant now = clock.instant();
        windows.values().removeIf(w -> !now.isBefore(w.resetAt()));
    }
}