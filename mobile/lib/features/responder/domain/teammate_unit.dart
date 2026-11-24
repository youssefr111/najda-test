import 'mission.dart';
import 'unit.dart';

/// Route colors, in a fixed order. Index 0 is the responder's own route.
const teammateRouteColors = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#dc2626',
];

/// Another unit working the same incident, as drawn on the route map.
class TeammateUnit {
  const TeammateUnit({
    required this.missionId,
    required this.plateNumber,
    required this.unitType,
    required this.status,
    required this.latitude,
    required this.longitude,
    required this.color,
  });

  final int missionId;
  final String? plateNumber;
  final UnitType unitType;
  final MissionStatus status;
  final double latitude;
  final double longitude;
  final String color;

  /// Units that have arrived are shown as a dot only; the others get a route.
  bool get isRoutable =>
      status == MissionStatus.accepted || status == MissionStatus.enRoute;

  String get label => plateNumber ?? '#$missionId';
}

/// Other units on the incident that are visible to this responder: accepted,
/// en route or arrived, positioned at their live location (or home station if
/// they have not reported one yet).
List<TeammateUnit> teammateUnits({
  required int currentMissionId,
  required List<Mission> incidentMissions,
  required List<ResponseUnit> units,
}) {
  const visible = {
    MissionStatus.accepted,
    MissionStatus.enRoute,
    MissionStatus.arrived,
  };
  final others =
      incidentMissions.where((m) => m.id != currentMissionId).toList()
        ..sort((a, b) => a.id.compareTo(b.id));

  final result = <TeammateUnit>[];
  for (var index = 0; index < others.length; index++) {
    final mission = others[index];
    if (!visible.contains(mission.status)) continue;

    final unit = units.where((u) => u.id == mission.unitId).firstOrNull;
    final latitude = unit?.latitude ?? unit?.facilityLatitude;
    final longitude = unit?.longitude ?? unit?.facilityLongitude;
    if (latitude == null || longitude == null) continue;

    result.add(
      TeammateUnit(
        missionId: mission.id,
        plateNumber: mission.unitPlateNumber.isEmpty
            ? null
            : mission.unitPlateNumber,
        unitType: mission.unitType,
        status: mission.status,
        latitude: latitude,
        longitude: longitude,
        color: teammateRouteColors[(index + 1) % teammateRouteColors.length],
      ),
    );
  }
  return result;
}
