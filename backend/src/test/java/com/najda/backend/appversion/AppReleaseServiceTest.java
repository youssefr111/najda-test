package com.najda.backend.appversion;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.najda.backend.appversion.config.AppReleaseProperties;
import com.najda.backend.appversion.service.AppReleaseService;
import com.najda.backend.appversion.service.ReleaseInfo;
import com.najda.backend.appversion.service.ReleaseLookupException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

class AppReleaseServiceTest {

    private static final ReleaseInfo V1 = new ReleaseInfo("1.0.0", 101, "https://github.com/o/r/releases/tag/v1.0.0");
    private static final ReleaseInfo V2 = new ReleaseInfo("2.0.0", 202, "https://github.com/o/r/releases/tag/v2.0.0");
    private static final AppReleaseProperties PROPERTIES =
            new AppReleaseProperties("o/r", Duration.ofMinutes(15), Duration.ofMinutes(1));

    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-10-22T10:00:00Z"));
    private final Clock clock = new Clock() {
        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now.get();
        }
    };

    private final AtomicInteger calls = new AtomicInteger();
    private Supplier<Optional<ReleaseInfo>> github = () -> Optional.of(V1);
    private final AppReleaseService service = new AppReleaseService(
            () -> {
                calls.incrementAndGet();
                return github.get();
            },
            PROPERTIES,
            clock);

    private void advance(Duration time) {
        now.updateAndGet(current -> current.plus(time));
    }

    private static Optional<ReleaseInfo> githubIsDown() {
        throw new ReleaseLookupException("down");
    }

    @Test
    void asksGithubOnlyOnceWhileTheAnswerIsFresh() {
        assertEquals(Optional.of(V1), service.latest());
        advance(Duration.ofMinutes(14));
        assertEquals(Optional.of(V1), service.latest());
        assertEquals(1, calls.get());
    }

    @Test
    void picksUpANewReleaseOnceTheAnswerExpires() {
        service.latest();
        github = () -> Optional.of(V2);
        advance(Duration.ofMinutes(16));

        assertEquals(Optional.of(V2), service.latest());
        assertEquals(2, calls.get());
    }

    @Test
    void keepsServingTheLastGoodAnswerWhenGithubFailsAndBacksOff() {
        service.latest();
        github = AppReleaseServiceTest::githubIsDown;
        advance(Duration.ofMinutes(16));

        assertEquals(Optional.of(V1), service.latest());
        assertEquals(2, calls.get());

        advance(Duration.ofSeconds(30));
        assertEquals(Optional.of(V1), service.latest());
        assertEquals(2, calls.get()); // still backing off

        advance(Duration.ofSeconds(31));
        service.latest();
        assertEquals(3, calls.get());
    }

    @Test
    void isEmptyWhenGithubFailsBeforeAnyAnswerExists() {
        github = AppReleaseServiceTest::githubIsDown;

        assertEquals(Optional.empty(), service.latest());
        assertEquals(Optional.empty(), service.latest());
        assertEquals(1, calls.get());
    }

    @Test
    void remembersThatNoReleaseExistsYet() {
        github = Optional::empty;

        assertEquals(Optional.empty(), service.latest());
        assertEquals(Optional.empty(), service.latest());
        assertEquals(1, calls.get());
    }
}