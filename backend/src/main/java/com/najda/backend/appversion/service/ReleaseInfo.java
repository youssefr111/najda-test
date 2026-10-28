package com.najda.backend.appversion.service;

/**
 * The newest published release.
 *
 * @param version the version without any leading "v", e.g. {@code 1.2.0}.
 * @param build   the Android build number (versionCode) of the published APK, or null when the release does not say.
 *                It tells apart two builds that were published under the same version.
 * @param url     the release's page, where the APK is downloaded.
 */
public record ReleaseInfo(String version, Integer build, String url) {}