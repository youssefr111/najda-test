package com.najda.backend.appversion.controller;

import com.najda.backend.appversion.dto.AppVersionResponse;
import com.najda.backend.appversion.service.AppReleaseService;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, because the app checks for updates before anyone has signed in. The answer is the same for every caller and
 * carries nothing private, so it is also marked cacheable by proxies.
 */
@RestController
@RequestMapping("/api/app/version")
public class AppVersionController {

    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic();

    private final AppReleaseService releases;

    public AppVersionController(AppReleaseService releases) {
        this.releases = releases;
    }

    /** 200 with the newest release, or 204 when none is known (nothing published, or GitHub unreachable so far). */
    @GetMapping
    public ResponseEntity<AppVersionResponse> latest() {
        return releases.latest()
                .map(release -> ResponseEntity.ok().cacheControl(CACHE).body(AppVersionResponse.from(release)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}