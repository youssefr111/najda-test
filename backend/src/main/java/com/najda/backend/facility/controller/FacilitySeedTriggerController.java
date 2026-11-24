package com.najda.backend.facility.controller;

import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.seed.FacilityDataSeeder;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/facilities")
public class FacilitySeedTriggerController {

    private static final Logger log = LoggerFactory.getLogger(FacilitySeedTriggerController.class);
    private final FacilityDataSeeder facilityDataSeeder;
    private final ConcurrentHashMap<FacilityType, AtomicBoolean> running = new ConcurrentHashMap<>();

    public FacilitySeedTriggerController(FacilityDataSeeder facilityDataSeeder) {
        this.facilityDataSeeder = facilityDataSeeder;
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @PostMapping("/seed-once")
    public ResponseEntity<?> triggerSeed(@RequestParam FacilityType type) {
        if (type == FacilityType.AMBULANCE_STATION) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ambulance stations aren't OSM-seedable -- add manually."));
        }
        AtomicBoolean flag = running.computeIfAbsent(type, t -> new AtomicBoolean(false));
        if (!flag.compareAndSet(false, true)) {
            return ResponseEntity.status(409).body(Map.of("error", "A seed for " + type + " is already running."));
        }

        new Thread(() -> {
            try {
                log.info("Facility seed started for type={}", type);
                FacilityDataSeeder.SeedResult result = facilityDataSeeder.run(type);
                log.info("Facility seed finished: type={}, created={}, mirror={}", type, result.created(), result.mirrorUsed());
            } catch (Exception e) {
                log.error("Facility seed failed", e);
            } finally {
                flag.set(false);
            }
        }, "facility-seed-" + type).start();

        return ResponseEntity.accepted().body(Map.of("message", "Started. Check the Render Logs tab in a couple of minutes."));
    }
}