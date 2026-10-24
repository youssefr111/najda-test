package com.najda.backend.incident.service;

import com.najda.backend.incident.model.CancellationCategory;
import com.najda.backend.incident.model.FalseReportType;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * How much the system trusts a caller's NEXT report, from their recent history. Pure and deterministic
 * (no database, no clock): the same inputs always give the same answer, which is what makes it testable.
 *
 * <p>Design rules, in priority order:
 * <ol>
 *   <li><b>An emergency line must fail open.</b> Nothing here ever refuses a report outright. The harshest
 *       automatic effect is a short wait between reports, and the caller is told the emergency numbers.
 *       Suspending an account stays a deliberate human decision (admin).</li>
 *   <li><b>Only evidence of abuse counts.</b> A dispatcher's false-report verdict is strong evidence. A
 *       cancellation is weak evidence: cancelling before any unit committed is free (accidental SOS taps
 *       are normal), and "the problem resolved / I got help elsewhere" barely counts.</li>
 *   <li><b>Severity matters.</b> Malicious &gt; prank &gt; spam/test &gt; wasted dispatch.</li>
 *   <li><b>People can recover.</b> Every event fades with a 30-day half-life and drops out after 120 days.</li>
 * </ol>
 */
public final class CallerTrustPolicy {

    private CallerTrustPolicy() {}

    public enum Tier {
        /** Nothing to note. */
        NONE,
        /** Worth a dispatcher's awareness; appears on the admin review list. */
        WATCH,
        /** A short wait between new reports. */
        COOLDOWN,
        /** Wait between reports, and an admin should review the account. Reports are still accepted. */
        REVIEW
    }

    public record FalseReport(FalseReportType type, Instant at) {}

    /** {@code unitHadAccepted}: a response unit had accepted the mission before the caller cancelled. */
    public record Cancellation(CancellationCategory category, Instant at, boolean unitHadAccepted) {}

    public record Assessment(double score, Tier tier, Duration minimumGapBetweenReports) {
        public boolean hasCooldown() {
            return !minimumGapBetweenReports.isZero();
        }
    }

    /** Events fade by half every this many days... */
    static final double HALF_LIFE_DAYS = 30;

    /** ...and stop counting entirely after this many. */
    public static final int WINDOW_DAYS = 120;

    static final double WATCH_AT = 3;
    static final double COOLDOWN_AT = 6;
    static final double REVIEW_AT = 10;

    static final Duration COOLDOWN_GAP = Duration.ofMinutes(10);

    static double weight(FalseReportType type) {
        return switch (type) {
            case MALICIOUS -> 10;
            case PRANK_OR_HOAX -> 6;
            case SPAM_OR_TEST -> 3;
        };
    }

    static double weight(Cancellation cancellation) {
        if (!cancellation.unitHadAccepted()) return 0; // free: nothing was spent
        return switch (cancellation.category()) {
            case SUBMITTED_BY_MISTAKE, OTHER -> 2;
            case SITUATION_RESOLVED, GOT_HELP_ELSEWHERE, DUPLICATE_REPORT -> 0.5;
        };
    }

    static double decay(Instant at, Instant now) {
        double ageDays = Duration.between(at, now).toSeconds() / 86_400.0;
        if (ageDays > WINDOW_DAYS) return 0;
        if (ageDays <= 0) return 1;
        return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    }

    public static Assessment assess(List<FalseReport> falseReports, List<Cancellation> cancellations, Instant now) {
        double score = 0;
        for (FalseReport report : falseReports) {
            score += weight(report.type()) * decay(report.at(), now);
        }
        for (Cancellation cancellation : cancellations) {
            score += weight(cancellation) * decay(cancellation.at(), now);
        }
        score = Math.round(score * 100) / 100.0;

        Tier tier = score >= REVIEW_AT ? Tier.REVIEW
                : score >= COOLDOWN_AT ? Tier.COOLDOWN
                : score >= WATCH_AT ? Tier.WATCH
                : Tier.NONE;
        Duration gap = (tier == Tier.COOLDOWN || tier == Tier.REVIEW) ? COOLDOWN_GAP : Duration.ZERO;
        return new Assessment(score, tier, gap);
    }
}
