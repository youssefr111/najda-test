package com.najda.backend.facility.seed;

import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.repository.FacilityRepository;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * On startup, loads {@code content/facilities.csv} into the facilities table. It runs after
 * {@code SystemUserInitializer} (order 2), which creates the test facilities first, and it only adds
 * what is missing: a facility already stored at the same spot and of the same type is left untouched,
 * so every restart is a no-op once the file has been loaded.
 *
 * <p>Switch it off with {@code najda.seed.facilities.enabled=false} (env {@code FACILITY_SEED_ENABLED}).
 */
@Component
@Order(FacilityCsvSeeder.ORDER)
@ConditionalOnProperty(prefix = "najda.seed.facilities", name = "enabled", havingValue = "true", matchIfMissing = true)
public class FacilityCsvSeeder implements ApplicationRunner {

    static final int ORDER = 3;

    private static final Logger log = LoggerFactory.getLogger(FacilityCsvSeeder.class);
    private static final String SEED = "content/facilities.csv";

    /** Coordinates are compared at 4 decimals (about 11 m), the same tolerance as the OpenStreetMap seed. */
    private static final double COORDINATE_SCALE = 10_000;

    private final FacilityRepository facilityRepository;
    private final FacilityCsvParser parser;

    FacilityCsvSeeder(FacilityRepository facilityRepository, FacilityCsvParser parser) {
        this.facilityRepository = facilityRepository;
        this.parser = parser;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        ClassPathResource resource = new ClassPathResource(SEED);
        if (!resource.exists()) {
            log.warn("No facility seed found at {}", SEED);
            return;
        }

        FacilityCsvParser.Result parsed;
        try (InputStream in = resource.getInputStream()) {
            parsed = parser.parse(in);
        }

        List<Facility> missing = missing(parsed.rows(), facilityRepository.findAll());
        facilityRepository.saveAll(missing); // one transaction: the file loads completely or not at all

        log.info("Facility seed {}: {} created, {} already present, {} rejected",
                SEED, missing.size(), parsed.rows().size() - missing.size(), parsed.rejected());
    }

    /** The rows that are not stored yet, in file order. A spot that appears twice in the file counts once. */
    static List<Facility> missing(List<FacilitySeedRow> rows, Collection<Facility> existing) {
        Set<Spot> known = new HashSet<>();
        for (Facility facility : existing) {
            known.add(Spot.of(facility.getFacilityType(), facility.getLatitude(), facility.getLongitude()));
        }

        List<Facility> missing = new ArrayList<>();
        for (FacilitySeedRow row : rows) {
            if (known.add(Spot.of(row.type(), row.latitude(), row.longitude()))) {
                missing.add(row.toFacility());
            }
        }
        return missing;
    }

    private record Spot(FacilityType type, long latitude, long longitude) {
        static Spot of(FacilityType type, double latitude, double longitude) {
            return new Spot(type, Math.round(latitude * COORDINATE_SCALE), Math.round(longitude * COORDINATE_SCALE));
        }
    }
}
