package com.najda.backend.facility.seed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.najda.backend.facility.model.Facility;
import com.najda.backend.facility.model.FacilityType;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class FacilityCsvSeederTest {

    private static FacilitySeedRow row(String name, FacilityType type, double lat, double lon) {
        return new FacilitySeedRow(name, "address", type, lat, lon);
    }

    private static Facility stored(FacilityType type, double lat, double lon) {
        Facility facility = new Facility();
        facility.setName("stored");
        facility.setFacilityType(type);
        facility.setLatitude(lat);
        facility.setLongitude(lon);
        return facility;
    }

    @SuppressWarnings("null")
    @Test
    void addsEveryRowToAnEmptyTableInFileOrderAsUnregistered() {
        var missing = FacilityCsvSeeder.missing(List.of(
                row("A", FacilityType.HOSPITAL, 30.0, 31.0),
                row("B", FacilityType.POLICE_STATION, 30.1, 31.1)), List.of());

        assertEquals(List.of("A", "B"), missing.stream().map(Facility::getName).toList());
        assertFalse(missing.stream().anyMatch(Facility::isRegistered));
    }

    @Test
    void leavesAFacilityAlreadyStoredAtTheSameSpotAndTypeAlone() {
        var missing = FacilityCsvSeeder.missing(
                List.of(row("A", FacilityType.HOSPITAL, 30.00001, 31.00001)),
                List.of(stored(FacilityType.HOSPITAL, 30.0, 31.0)));

        assertEquals(0, missing.size());
    }

    @Test
    void theSameSpotWithAnotherTypeIsADifferentFacility() {
        var missing = FacilityCsvSeeder.missing(
                List.of(row("A", FacilityType.POLICE_STATION, 30.0, 31.0)),
                List.of(stored(FacilityType.HOSPITAL, 30.0, 31.0)));

        assertEquals(1, missing.size());
    }

    @Test
    void aSpotRepeatedInsideTheFileIsAddedOnce() {
        var missing = FacilityCsvSeeder.missing(List.of(
                row("A", FacilityType.HOSPITAL, 30.0, 31.0),
                row("A again", FacilityType.HOSPITAL, 30.0, 31.0)), List.of());

        assertEquals(1, missing.size());
    }

    @Test
    void theBundledSeedFileHasNoDuplicateSpots() throws IOException {
        try (InputStream in = new ClassPathResource("content/facilities.csv").getInputStream()) {
            var rows = new FacilityCsvParser().parse(in).rows();

            assertEquals(rows.size(), FacilityCsvSeeder.missing(rows, List.of()).size());
        }
    }
}
