import '../../../core/utils/wire_enum.dart';
import '../../responder/domain/mission.dart';
import '../../responder/domain/unit.dart';

/// One unit working an incident, as a citizen is allowed to see it.
class IncidentResponder {
  const IncidentResponder({
    required this.missionId,
    required this.unitType,
    required this.status,
    required this.latitude,
    required this.longitude,
  });

  factory IncidentResponder.fromJson(Map<String, dynamic> json) => IncidentResponder(
        missionId: json['missionId'] as int,
        unitType: enumFromWire(UnitType.values, json['unitType']),
        status: enumFromWire(MissionStatus.values, json['status']),
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
      );

  final int missionId;
  final UnitType unitType;
  final MissionStatus status;

  /// `null` when the server withholds the position (police units).
  final double? latitude;
  final double? longitude;

  bool get hasPosition => latitude != null && longitude != null;
}
