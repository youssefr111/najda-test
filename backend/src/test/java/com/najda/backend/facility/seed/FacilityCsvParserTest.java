package com.najda.backend.facility.seed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.najda.backend.facility.model.FacilityType;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class FacilityCsvParserTest {

    private static final String HEADER = "id,address,facility_type,latitude,longitude,name,registered\n";

    private final FacilityCsvParser parser = new FacilityCsvParser();

    @Test
    void readsQuotedArabicAddressesWithCommas() throws IOException {
        var result = parse(HEADER + "6,\"معهد القلب, شارع النبوى, الجيزة\",HOSPITAL,30.064775,31.209801,معهد القلب,FALSE\n");

        assertEquals(0, result.rejected());
        assertEquals(
                new FacilitySeedRow("معهد القلب", "معهد القلب, شارع النبوى, الجيزة", FacilityType.HOSPITAL, 30.064775, 31.209801),
                result.rows().get(0));
    }

    @Test
    void aBlankAddressBecomesNullSoTheAddressBackfillPicksItUp() throws IOException {
        var result = parse(HEADER + "7,,FIRE_STATION,30.1,31.2,Station,FALSE\n");

        assertNull(result.rows().get(0).address());
    }

    @Test
    void skipsBadRecordsAndKeepsTheRest() throws IOException {
        var result = parse(HEADER
                + "1,a,HOSPITAL,30.0,31.0,Good,FALSE\n"
                + "2,a,HOSPITAL,30.0,31.0,,FALSE\n"          // blank name
                + "3,a,CLINIC,30.0,31.0,Unknown type,FALSE\n"  // not a FacilityType
                + "4,a,HOSPITAL,95.0,31.0,Latitude,FALSE\n"    // latitude out of range
                + "5,a,HOSPITAL,30.0,abc,Longitude,FALSE\n"    // not a number
                + "6,a,HOSPITAL\n");                           // truncated

        assertEquals(1, result.rows().size());
        assertEquals("Good", result.rows().get(0).name());
        assertEquals(5, result.rejected());
    }

    @Test
    void failsFastWhenARequiredColumnIsMissing() {
        var csv = new ByteArrayInputStream("id,name,address\n1,A,B\n".getBytes(StandardCharsets.UTF_8));

        assertThrows(IllegalStateException.class, () -> parser.parse(csv));
    }

    @Test
    void theBundledSeedFileIsWellFormed() throws IOException {
        try (InputStream in = new ClassPathResource("content/facilities.csv").getInputStream()) {
            var result = parser.parse(in);

            assertFalse(result.rows().isEmpty());
            assertEquals(0, result.rejected());
        }
    }

    private FacilityCsvParser.Result parse(String csv) throws IOException {
        return parser.parse(new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8)));
    }
}
