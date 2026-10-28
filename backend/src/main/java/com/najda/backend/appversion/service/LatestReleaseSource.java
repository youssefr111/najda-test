package com.najda.backend.appversion.service;

import java.util.Optional;

/** Somewhere the newest release can be looked up. */
@FunctionalInterface
public interface LatestReleaseSource {

    /**
     * @return the newest release, or empty when none has been published (or its tag is not a plain version).
     * @throws ReleaseLookupException when the source could not be reached or answered with an error.
     */
    Optional<ReleaseInfo> fetchLatest();
}