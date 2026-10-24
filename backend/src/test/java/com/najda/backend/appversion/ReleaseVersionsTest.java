package com.najda.backend.appversion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.najda.backend.appversion.service.ReleaseVersions;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ReleaseVersionsTest {

    @Test
    void stripsTheLeadingV() {
        assertEquals(Optional.of("1.2.0"), ReleaseVersions.fromTag("v1.2.0"));
        assertEquals(Optional.of("1.2.0"), ReleaseVersions.fromTag("1.2.0"));
        assertEquals(Optional.of("2.0"), ReleaseVersions.fromTag(" V2.0 "));
    }

    @Test
    void rejectsAnythingThatIsNotAPlainVersion() {
        for (String tag : new String[] {null, "", "latest", "v1", "v1.2.0-rc1", "v1.2.x", "v1.2.0\nfoo", "v1.2.0/../x"}) {
            assertTrue(ReleaseVersions.fromTag(tag).isEmpty(), "should reject: " + tag);
        }
    }

    @Test
    void readsTheBuildNumberFromTheApkFileName() {
        assertEquals(Optional.of(142), ReleaseVersions.buildFromAssetName("najda-v1.0.0-build142.apk"));
        assertEquals(Optional.of(10001), ReleaseVersions.buildFromAssetName("najda-v2.10.3-build10001.apk"));
    }

    @Test
    void ignoresFilesThatDoNotCarryABuildNumber() {
        for (String name : new String[] {null, "", "najda-latest.apk", "najda-v1.0.0.apk", "najda-v1.0.0-build.apk",
                "najda-v1.0.0-build1234567890.apk", "other-build5.apk"}) {
            assertTrue(ReleaseVersions.buildFromAssetName(name).isEmpty(), "should ignore: " + name);
        }
    }
}