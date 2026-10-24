package com.najda.backend.appversion.dto;

import com.najda.backend.appversion.service.ReleaseInfo;

/**
 * @param latestVersion the newest released app version, e.g. {@code 1.2.0}.
 * @param latestBuild   that release's build number, or null when unknown. Lets a rebuild of the same version be noticed.
 * @param releaseUrl    the release page, where sideloaded installs download the APK.
 */
public record AppVersionResponse(String latestVersion, Integer latestBuild, String releaseUrl) {

    public static AppVersionResponse from(ReleaseInfo release) {
        return new AppVersionResponse(release.version(), release.build(), release.url());
    }
}