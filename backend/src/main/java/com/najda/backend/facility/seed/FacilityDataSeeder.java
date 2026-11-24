package com.najda.backend.facility.seed;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import com.najda.backend.facility.repository.FacilityRepository;
import com.najda.backend.incident.service.ReverseGeocodingService;
import com.najda.backend.seed.OverpassClient;
import java.util.HashSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class FacilityDataSeeder {

    private final OverpassClient overpassClient;
    private final FacilityRepository facilityRepository;
    private final ReverseGeocodingService reverseGeocodingService;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Logger log = LoggerFactory.getLogger(FacilityDataSeeder.class);

    public FacilityDataSeeder(OverpassClient overpassClient, FacilityRepository facilityRepository, ReverseGeocodingService reverseGeocodingService) {
        this.overpassClient = overpassClient;
        this.facilityRepository = facilityRepository;
        this.reverseGeocodingService = reverseGeocodingService;
    }

    public record SeedResult(int created, int skippedDuplicate, int skippedUnnamed, String mirrorUsed) {}

    public SeedResult run(FacilityType type) throws Exception {
        String osmTag = switch (type) {
            case HOSPITAL -> "\"amenity\"=\"hospital\"";
            case FIRE_STATION -> "\"amenity\"=\"fire_station\"";
            case POLICE_STATION -> "\"amenity\"=\"police\"";
            case AMBULANCE_STATION -> throw new IllegalArgumentException("Ambulance stations aren't reliably tagged on OSM -- add these manually.");
        };

        String query = """
                [out:json][timeout:180];
                area["ISO3166-1"="EG"][admin_level=2]->.egypt;
                (
                  node[%s](area.egypt);
                  way[%s](area.egypt);
                  relation[%s](area.egypt);
                );
                out center tags;
                """.formatted(osmTag, osmTag, osmTag);

        OverpassClient.MirrorResponse response = overpassClient.fetch(query);
        JsonNode elements = mapper.readTree(response.body()).get("elements");

        Set<Long> existingKeys = new HashSet<>();
        for (Facility f : facilityRepository.findAll()) {
            existingKeys.add(coordKey(f.getLatitude(), f.getLongitude()));
        }

        int created = 0, skippedUnnamed = 0, skippedDuplicate = 0;

        for (JsonNode element : elements) {
            JsonNode tags = element.get("tags");
            String name = tags != null && tags.has("name") ? tags.get("name").asText()
                    : tags != null && tags.has("name:en") ? tags.get("name:en").asText() : null;
            if (name == null || name.isBlank()) { skippedUnnamed++; continue; }

            Double lat, lon;
            if (element.has("lat") && element.has("lon")) {
                lat = element.get("lat").asDouble();
                lon = element.get("lon").asDouble();
            } else if (element.has("center")) {
                lat = element.get("center").get("lat").asDouble();
                lon = element.get("center").get("lon").asDouble();
            } else continue;

            long key = coordKey(lat, lon);
            if (!existingKeys.add(key)) { skippedDuplicate++; continue; }

            Facility facility = new Facility();
            facility.setName(name);
            try {
                facility.setAddress(buildAddress(tags, lat, lon));
            } catch (ReverseGeocodingService.RateLimitedException e) {
                log.warn("Nominatim rate-limited during facility seeding -- stopping this batch early. {} facilities created so far.", created);
                break;
            }
            facility.setLatitude(lat);
            facility.setLongitude(lon);
            facility.setFacilityType(type);
            facility.setRegistered(false);
            facilityRepository.save(facility);
            created++;
        }

        return new SeedResult(created, skippedDuplicate, skippedUnnamed, response.mirrorUsed());
    }

    private String buildAddress(JsonNode tags, double lat, double lon) throws ReverseGeocodingService.RateLimitedException {
        String houseNumber = tags.has("addr:housenumber") ? tags.get("addr:housenumber").asText() : null;
        String street = tags.has("addr:street") ? tags.get("addr:street").asText() : null;
        String city = tags.has("addr:city") ? tags.get("addr:city").asText() : null;
        String osmAddress = java.util.stream.Stream.of(houseNumber, street, city)
                .filter(s -> s != null && !s.isBlank())
                .collect(java.util.stream.Collectors.joining(", "));

        if (!osmAddress.isBlank()) {
            return osmAddress;
        }

        try {
            Thread.sleep(1100);
            return reverseGeocodingService.reverseGeocode(lat, lon).orElse("");
        } catch (ReverseGeocodingService.RateLimitedException e) {
            throw e; // propagate -- the caller (run()) needs to abort the whole batch, not just skip this one facility
        } catch (Exception e) {
            return ""; // any other failure -- fine to just skip this one facility and continue
        }
    }

    private long coordKey(double lat, double lon) {
        return Math.round(lat * 10000) * 1_000_000L + Math.round(lon * 10000);
    }
}