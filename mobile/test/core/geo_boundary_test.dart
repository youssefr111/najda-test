import 'package:flutter_test/flutter_test.dart';
import 'package:najda/core/geo/boundary.dart';
import 'package:najda/core/geo/geo_utils.dart';
import 'package:najda/core/utils/request_id.dart';
import 'package:najda/features/incident/domain/incident_location_config.dart';

void main() {
  // GeoJSON is [longitude, latitude]. A square from lng 25-37, lat 22-32.
  const square = {
    'type': 'Polygon',
    'coordinates': [
      [
        [25.0, 22.0],
        [37.0, 22.0],
        [37.0, 32.0],
        [25.0, 32.0],
        [25.0, 22.0],
      ],
    ],
  };

  group('GeoBoundary', () {
    test('contains points inside and rejects points outside', () {
      final boundary = GeoBoundary.tryParse(square)!;
      expect(boundary.contains(30.0, 31.0), isTrue); // Cairo-ish
      expect(boundary.contains(40.0, 31.0), isFalse); // north of the box
      expect(boundary.contains(30.0, 20.0), isFalse); // west of the box
    });

    test('honours holes', () {
      final boundary = GeoBoundary.tryParse({
        'type': 'Polygon',
        'coordinates': [
          [
            [0.0, 0.0],
            [10.0, 0.0],
            [10.0, 10.0],
            [0.0, 10.0],
            [0.0, 0.0],
          ],
          [
            [4.0, 4.0],
            [6.0, 4.0],
            [6.0, 6.0],
            [4.0, 6.0],
            [4.0, 4.0],
          ],
        ],
      })!;
      expect(boundary.contains(2.0, 2.0), isTrue);
      expect(boundary.contains(5.0, 5.0), isFalse); // inside the hole
    });

    test('supports MultiPolygon', () {
      final boundary = GeoBoundary.tryParse({
        'type': 'MultiPolygon',
        'coordinates': [
          [
            [
              [0.0, 0.0],
              [1.0, 0.0],
              [1.0, 1.0],
              [0.0, 1.0],
              [0.0, 0.0],
            ],
          ],
          [
            [
              [10.0, 10.0],
              [11.0, 10.0],
              [11.0, 11.0],
              [10.0, 11.0],
              [10.0, 10.0],
            ],
          ],
        ],
      })!;
      expect(boundary.contains(0.5, 0.5), isTrue);
      expect(boundary.contains(10.5, 10.5), isTrue);
      expect(boundary.contains(5.0, 5.0), isFalse);
    });

    test('an unusable outline yields null instead of throwing', () {
      expect(GeoBoundary.tryParse(null), isNull);
      expect(GeoBoundary.tryParse({'type': 'Point', 'coordinates': [1, 2]}), isNull);
      expect(GeoBoundary.tryParse({'type': 'Polygon', 'coordinates': 'nope'}), isNull);
    });
  });

  group('circleRing', () {
    test('every point sits on the requested radius', () {
      const lat = 30.0444, lng = 31.2357, radius = 300.0;
      final ring = circleRing(lat, lng, radius);

      expect(ring.length, 65); // 64 steps, closed
      for (final point in ring) {
        expect(distanceMeters(lat, lng, point.latitude, point.longitude), closeTo(radius, 1));
      }
    });
  });

  group('IncidentLocationConfig', () {
    test('unknown config accepts every point locally (the server still validates)', () {
      expect(IncidentLocationConfig.unknown.contains(0, 0), isTrue);
      expect(IncidentLocationConfig.unknown.allowManualPin, isFalse);
    });

    test('round-trips through JSON (it is cached for offline use)', () {
      final original = IncidentLocationConfig.fromJson({
        'allowManualPin': true,
        'manualPinMaxRadiusMeters': 300,
        'boundary': square,
      });
      final restored = IncidentLocationConfig.fromJson(
        Map<String, dynamic>.from(original.toJson()),
      );

      expect(restored.allowManualPin, isTrue);
      expect(restored.manualPinMaxRadiusMeters, 300);
      expect(restored.contains(30.0, 31.0), isTrue);
      expect(restored.contains(40.0, 31.0), isFalse);
    });
  });

  group('generateRequestId', () {
    test('matches the backend format and is unique', () {
      final pattern = RegExp(r'^[A-Za-z0-9_-]{8,64}$');
      final ids = {for (var i = 0; i < 200; i++) generateRequestId()};

      expect(ids.length, 200);
      expect(ids.every(pattern.hasMatch), isTrue);
    });
  });
}
