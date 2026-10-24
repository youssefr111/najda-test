import '../../../core/geo/boundary.dart';

/// The backend's rules for where an incident may be reported from
/// (`GET /api/config/incident-location`). One source of truth shared with the web.
class IncidentLocationConfig {
  const IncidentLocationConfig({
    required this.allowManualPin,
    required this.manualPinMaxRadiusMeters,
    this.boundary,
  });

  factory IncidentLocationConfig.fromJson(Map<String, dynamic> json) =>
      IncidentLocationConfig(
        allowManualPin: json['allowManualPin'] as bool? ?? false,
        manualPinMaxRadiusMeters:
            (json['manualPinMaxRadiusMeters'] as num?)?.toInt() ?? 0,
        boundary: GeoBoundary.tryParse(json['boundary']),
      );

  /// Used when the rules can't be loaded and nothing is cached: GPS only, with
  /// the server as the final judge of every report.
  static const unknown = IncidentLocationConfig(
    allowManualPin: false,
    manualPinMaxRadiusMeters: 0,
  );

  /// May the citizen move the pin away from their GPS fix?
  final bool allowManualPin;

  /// How far (metres) a manual pin may be from the device's own position.
  final int manualPinMaxRadiusMeters;

  /// Egypt's outline; `null` when unknown (every point is then accepted locally).
  final GeoBoundary? boundary;

  bool contains(double latitude, double longitude) =>
      boundary?.contains(latitude, longitude) ?? true;

  Map<String, Object?> toJson() => {
    'allowManualPin': allowManualPin,
    'manualPinMaxRadiusMeters': manualPinMaxRadiusMeters,
    'boundary': boundary?.raw,
  };
}
