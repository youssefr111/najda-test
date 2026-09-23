package com.najda.backend.user.service;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import com.najda.backend.exceptions.ConflictException;

@Component
public class EmailAvailabilityRateLimiter {
    private final Map<String, Deque<Instant>> requestLog = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS = 8;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    public void checkAllowed(String clientIp) {
        Deque<Instant> log = requestLog.computeIfAbsent(clientIp, k -> new ArrayDeque<>());
        synchronized (log) {
            Instant cutoff = Instant.now().minus(WINDOW);
            while (!log.isEmpty() && log.peekFirst().isBefore(cutoff)) log.pollFirst();
            if (log.size() >= MAX_REQUESTS) {
                throw new ConflictException("Too many requests -- please wait a moment.");
            }
            log.addLast(Instant.now());
        }
    }
}