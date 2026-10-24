package com.najda.backend.appversion.service;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Release tags the app understands: plain dotted numbers, optionally prefixed with "v". */
public final class ReleaseVersions {

    private static final Pattern TAG = Pattern.compile("[vV]?(\\d{1,4}(?:\\.\\d{1,4}){1,3})");
    private static final Pattern BUILD_ASSET = Pattern.compile("najda-v[\\d.]+-build(\\d{1,9})\\.apk");

    private ReleaseVersions() {}

    /** {@code "v1.2.0"} -> {@code "1.2.0"}; empty for anything else ({@code "nightly"}, {@code "v1.2.0-rc1"}, ...). */
    public static Optional<String> fromTag(String tag) {
        if (tag == null) return Optional.empty();
        Matcher matcher = TAG.matcher(tag.strip());
        return matcher.matches() ? Optional.of(matcher.group(1)) : Optional.empty();
    }

    /** {@code "najda-v1.0.0-build142.apk"} -> {@code 142}; empty for any other file name. */
    public static Optional<Integer> buildFromAssetName(String name) {
        if (name == null) return Optional.empty();
        Matcher matcher = BUILD_ASSET.matcher(name);
        return matcher.matches() ? Optional.of(Integer.valueOf(matcher.group(1))) : Optional.empty();
    }
}