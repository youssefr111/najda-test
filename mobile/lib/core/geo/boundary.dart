import 'dart:math' as math;

/// A latitude/longitude pair.
typedef LatLngPair = ({double latitude, double longitude});

/// A GeoJSON `Polygon` / `MultiPolygon` outline, as served by
/// `/api/config/incident-location`. It is the same polygon the backend checks
/// against, so the app can say "outside Egypt" before anything is sent.
///
/// An unusable outline never blocks the form: [tryParse] returns `null` and the
/// caller treats every point as inside -- the server still validates each report.
class GeoBoundary {
  const GeoBoundary._(this.raw, this._polygons);

  /// The original GeoJSON geometry (kept so it can be cached verbatim).
  final Map<String, dynamic> raw;

  /// polygons -> rings (first = outer boundary, rest = holes) -> `[lng, lat]`.
  final List<List<List<List<double>>>> _polygons;

  static GeoBoundary? tryParse(Object? json) {
    if (json is! Map) return null;
    final type = json['type'];
    final coordinates = json['coordinates'];
    if (coordinates is! List) return null;

    try {
      final rawPolygons = switch (type) {
        'Polygon' => [coordinates],
        'MultiPolygon' => coordinates,
        _ => const <Object?>[],
      };
      final polygons = [
        for (final polygon in rawPolygons)
          [
            for (final ring in polygon as List)
              [
                for (final point in ring as List)
                  [
                    ((point as List)[0] as num).toDouble(),
                    (point[1] as num).toDouble(),
                  ],
              ],
          ],
      ];
      if (polygons.isEmpty) return null;
      return GeoBoundary._(Map<String, dynamic>.from(json), polygons);
    } catch (_) {
      return null;
    }
  }

  /// Point-in-polygon, honouring holes.
  bool contains(double latitude, double longitude) {
    for (final rings in _polygons) {
      if (rings.isEmpty || !_inRing(rings.first, longitude, latitude)) continue;
      final inHole = rings
          .skip(1)
          .any((hole) => _inRing(hole, longitude, latitude));
      if (!inHole) return true;
    }
    return false;
  }

  static bool _inRing(List<List<double>> ring, double lng, double lat) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      final xi = ring[i][0], yi = ring[i][1];
      final xj = ring[j][0], yj = ring[j][1];
      final crosses =
          (yi > lat) != (yj > lat) &&
          lng < (xj - xi) * (lat - yi) / (yj - yi) + xi;
      if (crosses) inside = !inside;
    }
    return inside;
  }
}

const _earthRadiusMeters = 6371000.0;

double _toRadians(double degrees) => degrees * math.pi / 180;
double _toDegrees(double radians) => radians * 180 / math.pi;

/// A closed ring of points around a centre, for drawing the area in which a
/// manual pin may be placed.
List<LatLngPair> circleRing(
  double latitude,
  double longitude,
  double radiusMeters, {
  int steps = 64,
}) {
  final angular = radiusMeters / _earthRadiusMeters;
  final lat1 = _toRadians(latitude);
  final lng1 = _toRadians(longitude);

  return [
    for (var step = 0; step <= steps; step++)
      () {
        final bearing = 2 * math.pi * step / steps;
        final lat2 = math.asin(
          math.sin(lat1) * math.cos(angular) +
              math.cos(lat1) * math.sin(angular) * math.cos(bearing),
        );
        final lng2 =
            lng1 +
            math.atan2(
              math.sin(bearing) * math.sin(angular) * math.cos(lat1),
              math.cos(angular) - math.sin(lat1) * math.sin(lat2),
            );
        return (latitude: _toDegrees(lat2), longitude: _toDegrees(lng2));
      }(),
  ];
}
