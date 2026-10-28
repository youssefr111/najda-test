package com.najda.backend.appversion.service;

import com.najda.backend.appversion.config.AppReleaseProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * The newest app release, cached so the number of GitHub calls does not depend on how many phones ask.
 *
 * <ul>
 *   <li>A good answer is reused for {@code cacheTtl}; so is "no release yet".</li>
 *   <li>Only one request refreshes at a time. Others keep getting the previous answer instead of queueing behind GitHub.</li>
 *   <li>If GitHub fails, the last good answer keeps being served and the next attempt waits {@code errorBackoff}.</li>
 * </ul>
 *
 * State lives in memory, so each backend instance keeps its own copy (a few calls an hour, which is fine).
 */
@Service
public class AppReleaseService {

    private static final Logger log = LoggerFactory.getLogger(AppReleaseService.class);

    /** A cached answer; {@code release} is null when none is known. */
    private record Entry(ReleaseInfo release, Instant expiresAt) {}

    private final LatestReleaseSource source;
    private final AppReleaseProperties properties;
    private final Clock clock;
    private final ReentrantLock refreshLock = new ReentrantLock();
    private volatile Entry entry;

    public AppReleaseService(LatestReleaseSource source, AppReleaseProperties properties, Clock clock) {
        this.source = source;
        this.properties = properties;
        this.clock = clock;
    }

    public Optional<ReleaseInfo> latest() {
        Entry current = entry;
        if (isFresh(current)) return Optional.ofNullable(current.release());

        if (current == null) {
            refreshLock.lock(); // nothing to serve yet, so wait for the first answer
        } else if (!refreshLock.tryLock()) {
            return Optional.ofNullable(current.release()); // someone else is refreshing; serve what we have
        }
        try {
            if (isFresh(entry)) return Optional.ofNullable(entry.release()); // refreshed while we waited
            entry = refresh(entry);
            return Optional.ofNullable(entry.release());
        } finally {
            refreshLock.unlock();
        }
    }

    private Entry refresh(Entry previous) {
        Instant now = clock.instant();
        try {
            return new Entry(source.fetchLatest().orElse(null), now.plus(properties.cacheTtl()));
        } catch (ReleaseLookupException e) {
            log.warn("Could not refresh the latest app release: {}", e.getMessage());
            ReleaseInfo lastKnown = previous == null ? null : previous.release();
            return new Entry(lastKnown, now.plus(properties.errorBackoff()));
        }
    }

    private boolean isFresh(Entry candidate) {
        return candidate != null && clock.instant().isBefore(candidate.expiresAt());
    }
}