package com.najda.backend.status;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.google.firebase.FirebaseApp;

@RestController
@RequestMapping("/api")
public class StatusController {

    private static final Logger log = LoggerFactory.getLogger(StatusController.class);
    private static final long CACHE_MS = 15_000;

    private record Snapshot(boolean up, Map<String, Object> body, long at) {}

    private final JdbcTemplate jdbc;
    private volatile Snapshot snapshot;

    public StatusController(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.jdbc.setQueryTimeout(2);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Snapshot s = snapshot;
        if (s == null || isStale(s)) {
            s = refresh();
        }
        return ResponseEntity.status(s.up() ? 200 : 503)
                .cacheControl(CacheControl.noStore())
                .body(s.body());
    }

    private boolean isStale(Snapshot s) {
        return System.currentTimeMillis() - s.at() > CACHE_MS;
    }

    private synchronized Snapshot refresh() {
        Snapshot current = snapshot;
        if (current != null && !isStale(current)) {
            return current; // another request refreshed it while we waited
        }

        Map<String, String> components = new LinkedHashMap<>();
        components.put("api", "UP");
        components.put("database", checkDatabase());
        components.put("auth", FirebaseApp.getApps().isEmpty() ? "DOWN" : "UP");

        boolean up = components.values().stream().allMatch("UP"::equals);
        Map<String, Object> body = Map.of(
                "status", up ? "UP" : "DOWN",
                "components", Collections.unmodifiableMap(components));

        snapshot = new Snapshot(up, body, System.currentTimeMillis());
        return snapshot;
    }

    private String checkDatabase() {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            return "UP";
        } catch (Exception e) {
            log.warn("Status check: database unreachable ({})", e.getClass().getSimpleName());
            return "DOWN";
        }
    }
}