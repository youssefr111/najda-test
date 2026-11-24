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
