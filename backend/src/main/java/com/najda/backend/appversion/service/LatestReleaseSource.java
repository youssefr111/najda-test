package com.najda.backend.appversion.service;

import java.util.Optional;

/** Somewhere the newest release of a channel can be looked up. */
@FunctionalInterface
public interface LatestReleaseSource {

    /**
     * @return the newest release of the channel, or empty when none has been published (or it carries no usable version).
     * @throws ReleaseLookupException when the source could not be reached or answered with an error.
     */
    Optional<ReleaseInfo> fetchLatest(ReleaseChannel channel);
}