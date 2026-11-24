package com.najda.backend.incident;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.najda.backend.incident.model.CancellationCategory;
import com.najda.backend.incident.model.FalseReportType;
import com.najda.backend.incident.service.CallerTrustPolicy;
import com.najda.backend.incident.service.CallerTrustPolicy.Cancellation;
import com.najda.backend.incident.service.CallerTrustPolicy.FalseReport;
import com.najda.backend.incident.service.CallerTrustPolicy.Tier;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class CallerTrustPolicyTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");

    private static Instant daysAgo(long days) {
        return NOW.minus(Duration.ofDays(days));
    }

    @Test
    void aCleanHistoryIsNone() {
        var result = CallerTrustPolicy.assess(List.of(), List.of(), NOW);
        assertEquals(Tier.NONE, result.tier());
        assertEquals(0, result.score());
        assertFalse(result.hasCooldown());
    }

    @Test
    void cancellingBeforeAnyUnitCommittedIsFree() {
        var many = List.of(
                new Cancellation(CancellationCategory.SUBMITTED_BY_MISTAKE, daysAgo(1), false),
                new Cancellation(CancellationCategory.SUBMITTED_BY_MISTAKE, daysAgo(2), false),
                new Cancellation(CancellationCategory.OTHER, daysAgo(3), false),
                new Cancellation(CancellationCategory.OTHER, daysAgo(4), false));
        assertEquals(Tier.NONE, CallerTrustPolicy.assess(List.of(), many, NOW).tier());
    }

    @Test
    void severityDecidesTheTier() {
        assertEquals(Tier.WATCH, one(FalseReportType.SPAM_OR_TEST).tier());
        assertEquals(Tier.COOLDOWN, one(FalseReportType.PRANK_OR_HOAX).tier());
        assertEquals(Tier.REVIEW, one(FalseReportType.MALICIOUS).tier());
    }

    private static CallerTrustPolicy.Assessment one(FalseReportType type) {
        return CallerTrustPolicy.assess(List.of(new FalseReport(type, NOW)), List.of(), NOW);
    }

    @Test
    void cooldownAppliesFromTheCooldownTierUp() {
        assertFalse(one(FalseReportType.SPAM_OR_TEST).hasCooldown());
        assertEquals(Duration.ofMinutes(10), one(FalseReportType.PRANK_OR_HOAX).minimumGapBetweenReports());
        assertTrue(one(FalseReportType.MALICIOUS).hasCooldown());
    }

    @Test
    void eventsFadeWithAThirtyDayHalfLife() {
        var fresh = CallerTrustPolicy.assess(List.of(new FalseReport(FalseReportType.PRANK_OR_HOAX, NOW)), List.of(), NOW);
        var monthOld = CallerTrustPolicy.assess(List.of(new FalseReport(FalseReportType.PRANK_OR_HOAX, daysAgo(30))), List.of(), NOW);
        assertEquals(6.0, fresh.score(), 0.01);
        assertEquals(3.0, monthOld.score(), 0.05);
        // a prank that was serious a month ago is now only worth watching
        assertEquals(Tier.WATCH, monthOld.tier());
    }

    @Test
    void oldEventsStopCountingEntirely() {
        var ancient = CallerTrustPolicy.assess(
                List.of(new FalseReport(FalseReportType.MALICIOUS, daysAgo(CallerTrustPolicy.WINDOW_DAYS + 1))), List.of(), NOW);
        assertEquals(Tier.NONE, ancient.tier());
    }

    @Test
    void wastedDispatchesAddUpButResolvedCancellationsBarelyCount() {
        var wasted = List.of(
                new Cancellation(CancellationCategory.SUBMITTED_BY_MISTAKE, daysAgo(0), true),
                new Cancellation(CancellationCategory.SUBMITTED_BY_MISTAKE, daysAgo(0), true),
                new Cancellation(CancellationCategory.OTHER, daysAgo(0), true));
        assertEquals(Tier.COOLDOWN, CallerTrustPolicy.assess(List.of(), wasted, NOW).tier()); // 2+2+2 = 6

        var resolved = List.of(
                new Cancellation(CancellationCategory.SITUATION_RESOLVED, daysAgo(0), true),
                new Cancellation(CancellationCategory.GOT_HELP_ELSEWHERE, daysAgo(0), true),
                new Cancellation(CancellationCategory.DUPLICATE_REPORT, daysAgo(0), true));
        assertEquals(Tier.NONE, CallerTrustPolicy.assess(List.of(), resolved, NOW).tier()); // 0.5 x 3 = 1.5
    }

    @Test
    void noAutomaticOutcomeEverRefusesReportsOutright() {
        // The strongest signal still yields a bounded wait, never a block.
        var worst = CallerTrustPolicy.assess(
                List.of(new FalseReport(FalseReportType.MALICIOUS, NOW), new FalseReport(FalseReportType.MALICIOUS, NOW)),
                List.of(), NOW);
        assertEquals(Tier.REVIEW, worst.tier());
        assertTrue(worst.minimumGapBetweenReports().compareTo(Duration.ofMinutes(15)) <= 0);
    }
}
