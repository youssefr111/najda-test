package com.najda.backend.facility.seed;

import com.najda.backend.facility.model.FacilityType;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Reads the facility seed file. A broken header is a mistake in the file itself and fails loudly; a
 * single bad record is skipped and counted, so one typo cannot stop the rest from loading.
 *
 * <p>Columns used: {@code name, address, facility_type, latitude, longitude}. Any other column
 * ({@code id}, {@code registered}) is ignored: ids come from the database, and {@code registered} is
 * derived state.
 */
@Component
class FacilityCsvParser {

    private static final Logger log = LoggerFactory.getLogger(FacilityCsvParser.class);

    private static final String NAME = "name";
    private static final String ADDRESS = "address";
    private static final String TYPE = "facility_type";
    private static final String LATITUDE = "latitude";
    private static final String LONGITUDE = "longitude";
    private static final List<String> REQUIRED_COLUMNS = List.of(NAME, ADDRESS, TYPE, LATITUDE, LONGITUDE);

    private static final CSVFormat FORMAT = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreEmptyLines(true)
            .setTrim(true)
            .get();

    record Result(List<FacilitySeedRow> rows, int rejected) {}

    Result parse(InputStream in) throws IOException {
        try (CSVParser csv = FORMAT.parse(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            requireColumns(csv);

            List<FacilitySeedRow> rows = new ArrayList<>();
            int rejected = 0;
            for (CSVRecord record : csv) {
                try {
                    rows.add(toRow(record));
                } catch (IllegalArgumentException e) {
                    rejected++;
                    log.warn("Skipping facility CSV record {}: {}", record.getRecordNumber(), e.getMessage());
                }
            }
            return new Result(List.copyOf(rows), rejected);
        }
    }

    private static void requireColumns(CSVParser csv) {
        List<String> missing = REQUIRED_COLUMNS.stream()
                .filter(column -> !csv.getHeaderMap().containsKey(column))
                .toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Facility CSV is missing required column(s): " + missing);
        }
    }

    private static FacilitySeedRow toRow(CSVRecord record) {
        String name = record.get(NAME);
        if (name.isBlank()) {
            throw new IllegalArgumentException("name is blank");
        }
        String address = record.get(ADDRESS);
        return new FacilitySeedRow(
                name,
                address.isBlank() ? null : address,
                FacilityType.valueOf(record.get(TYPE).toUpperCase(Locale.ROOT)),
                coordinate(record.get(LATITUDE), 90, LATITUDE),
                coordinate(record.get(LONGITUDE), 180, LONGITUDE));
    }

    private static double coordinate(String text, double limit, String field) {
        double value = Double.parseDouble(text);
        if (!Double.isFinite(value) || Math.abs(value) > limit) {
            throw new IllegalArgumentException(field + " out of range: " + text);
        }
        return value;
    }
}
