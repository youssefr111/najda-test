package com.najda.backend.appversion.service;

/**
 * The newest published release.
 *
 * @param version the version without any leading "v", e.g. {@code 1.2.0}.
 * @param build   the Android build number (versionCode) of the published APK, or null when the release does not say.
 *                It tells apart two builds that were published under the same version.
 * @param url     the release's page.
 * @param apkUrl  the newest APK's direct download link (https), or null when the release carries none. Opening it
 *                starts the download straight away.
 * @param apkSize that APK's size in bytes, or null when unknown.
 */
public record ReleaseInfo(String version, Integer build, String url, String apkUrl, Long apkSize) {

    /** A release whose APK link is not known: clients fall back to the release page. */
    public ReleaseInfo(String version, Integer build, String url) {
        this(version, build, url, null, null);
    }
}