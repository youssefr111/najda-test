package com.najda.backend.appversion.service;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Release tags and APK file names the app understands: plain dotted version numbers. */
public final class ReleaseVersions {

    private static final String VERSION = "\\d{1,4}(?:\\.\\d{1,4}){1,3}";
    private static final Pattern TAG = Pattern.compile("[vV]?(" + VERSION + ")");
    private static final Pattern APK =
            Pattern.compile("najda-(?:test-)?v(?<version>" + VERSION + ")-build(?<build>\\d{1,9})\\.apk");

    private ReleaseVersions() {}

    /** An APK file name taken apart. */
    public record ApkAsset(String version, int build) {}

    /** {@code "v1.2.0"} -> {@code "1.2.0"}; empty for anything else ({@code "nightly"}, {@code "v1.2.0-rc1"}, ...). */
    public static Optional<String> fromTag(String tag) {
        if (tag == null) return Optional.empty();
        Matcher matcher = TAG.matcher(tag.strip());
        return matcher.matches() ? Optional.of(matcher.group(1)) : Optional.empty();
    }

    /**
     * {@code "najda-v1.0.0-build142.apk"} and {@code "najda-test-v1.0.0-build142.apk"} -> version {@code 1.0.0},
     * build {@code 142}; empty for any other file name.
     */
    public static Optional<ApkAsset> parseApk(String name) {
        if (name == null) return Optional.empty();
        Matcher matcher = APK.matcher(name);
        return matcher.matches()
                ? Optional.of(new ApkAsset(matcher.group("version"), Integer.parseInt(matcher.group("build"))))
                : Optional.empty();
    }
}