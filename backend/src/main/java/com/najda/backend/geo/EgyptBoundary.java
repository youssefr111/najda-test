package com.najda.backend.geo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Egypt's outline, loaded from geo/egypt-boundary.geojson. The same geometry is served to the web
 * client, so both sides judge "inside Egypt" against one polygon. Replace the file with a more
 * precise outline (Polygon or MultiPolygon, bare geometry, Feature or FeatureCollection) and
 * nothing else changes.
 */
@Component
public class EgyptBoundary {

    private static final String RESOURCE = "geo/egypt-boundary.geojson";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Plain maps and lists, so it serializes identically whichever Jackson version writes the response. */
    private final Map<String, Object> geometry;
    /** One entry per polygon; each holds its rings (first = outer boundary, rest = holes) as [lon, lat] pairs. */
    private final List<List<double[][]>> polygons;

    public EgyptBoundary() throws IOException {
        JsonNode node;
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            node = extractGeometry(MAPPER.readTree(in));
        }
        this.geometry = MAPPER.convertValue(node, new TypeReference<Map<String, Object>>() {});
        this.polygons = parsePolygons(node);
    }

    public Map<String, Object> geometry() {
        return geometry;
    }

    public boolean contains(double latitude, double longitude) {
        for (List<double[][]> rings : polygons) {
            if (!inRing(rings.get(0), longitude, latitude)) continue;
            boolean insideHole = false;
            for (int i = 1; i < rings.size(); i++) {
                if (inRing(rings.get(i), longitude, latitude)) {
                    insideHole = true;
                    break;
                }
            }
            if (!insideHole) return true;
        }
        return false;
    }

    private static boolean inRing(double[][] ring, double lon, double lat) {
        boolean inside = false;
        for (int i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            double xi = ring[i][0], yi = ring[i][1];
            double xj = ring[j][0], yj = ring[j][1];
            if ((yi > lat) != (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    private static JsonNode extractGeometry(JsonNode root) {
        return switch (root.path("type").asText()) {
            case "FeatureCollection" -> root.path("features").get(0).path("geometry");
            case "Feature" -> root.path("geometry");
            default -> root;
        };
    }

    private static List<List<double[][]>> parsePolygons(JsonNode geometry) {
        List<List<double[][]>> result = new ArrayList<>();
        JsonNode coordinates = geometry.path("coordinates");
        switch (geometry.path("type").asText()) {
            case "Polygon" -> result.add(parseRings(coordinates));
            case "MultiPolygon" -> coordinates.forEach(polygon -> result.add(parseRings(polygon)));
            default -> throw new IllegalStateException("The boundary must be a Polygon or MultiPolygon");
        }
        return result;
    }

    private static List<double[][]> parseRings(JsonNode rings) {
        List<double[][]> result = new ArrayList<>();
        for (JsonNode ring : rings) {
            double[][] points = new double[ring.size()][];
            for (int i = 0; i < ring.size(); i++) {
                points[i] = new double[] { ring.get(i).get(0).asDouble(), ring.get(i).get(1).asDouble() };
            }
            result.add(points);
        }
        return result;
    }
}