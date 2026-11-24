package com.najda.backend.appversion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.appversion.service.GithubReleaseClient;
import com.najda.backend.appversion.service.ReleaseChannel;
import com.najda.backend.appversion.service.ReleaseInfo;
import org.junit.jupiter.api.Test;

class GithubReleaseClientTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String PAGE = "https://github.com/o/r/releases/tag/v1.2.0";
    private static final String DOWNLOAD = "https://github.com/o/r/releases/download/v1.2.0/";

    private static JsonNode json(String text) throws Exception {
        return MAPPER.readTree(text);
    }

    @Test
    void passesOnTheDirectDownloadOfTheNewestApk() throws Exception {
        JsonNode release = json("""
                {"tag_name":"v1.2.0","html_url":"%s","assets":[
                  {"name":"najda-v1.2.0-build141.apk","size":1000,"browser_download_url":"%snajda-v1.2.0-build141.apk"},
                  {"name":"najda-v1.2.0-build142.apk","size":2000,"browser_download_url":"%snajda-v1.2.0-build142.apk"},
                  {"name":"notes.txt","size":5,"browser_download_url":"%snotes.txt"}]}
                """.formatted(PAGE, DOWNLOAD, DOWNLOAD, DOWNLOAD));

        ReleaseInfo info = GithubReleaseClient.toReleaseInfo(ReleaseChannel.PRODUCTION, release).orElseThrow();

        assertEquals("1.2.0", info.version());
        assertEquals(Integer.valueOf(142), info.build());
        assertEquals(PAGE, info.url());
        assertEquals(DOWNLOAD + "najda-v1.2.0-build142.apk", info.apkUrl());
        assertEquals(Long.valueOf(2000), info.apkSize());
    }

    @Test
    void hasNoDirectLinkWhenTheReleaseCarriesNoApk() throws Exception {
        JsonNode release = json("{\"tag_name\":\"v1.2.0\",\"html_url\":\"" + PAGE + "\",\"assets\":[]}");

        ReleaseInfo info = GithubReleaseClient.toReleaseInfo(ReleaseChannel.PRODUCTION, release).orElseThrow();

        assertEquals("1.2.0", info.version());
        assertNull(info.build());
        assertNull(info.apkUrl());
        assertNull(info.apkSize());
    }

    @Test
    void ignoresAnApkLinkThatIsNotHttps() throws Exception {
        JsonNode release = json("""
                {"tag_name":"v1.2.0","html_url":"%s","assets":[
                  {"name":"najda-v1.2.0-build142.apk","size":2000,"browser_download_url":"http://example.com/a.apk"}]}
                """.formatted(PAGE));

        ReleaseInfo info = GithubReleaseClient.toReleaseInfo(ReleaseChannel.PRODUCTION, release).orElseThrow();

        assertEquals(Integer.valueOf(142), info.build());
        assertNull(info.apkUrl());
    }

    @Test
    void ignoresAReleaseWithoutAUsableVersion() throws Exception {
        JsonNode release = json("{\"tag_name\":\"nightly\",\"html_url\":\"" + PAGE + "\",\"assets\":[]}");

        assertTrue(GithubReleaseClient.toReleaseInfo(ReleaseChannel.PRODUCTION, release).isEmpty());
    }
}