import '../../../core/network/json.dart';
import '../../../core/utils/wire_enum.dart';
import 'unit.dart';

enum MissionStatus implements WireEnum {
  offered('OFFERED'),
  accepted('ACCEPTED'),
  rejected('REJECTED'),
  enRoute('EN_ROUTE'),
  arrived('ARRIVED'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  const MissionStatus(this.wire);
  @override
  final String wire;

  /// Finished missions are listed separately from the ones still in play.
  bool get isPast => this == completed || this == rejected || this == cancelled;
}

class Mission {
  const Mission({
    required this.id,
    required this.incidentId,
    required this.unitType,
    required this.unitId,
    required this.unitPlateNumber,
    required this.status,
    required this.participantNames,
    required this.offeredAt,
  });

  factory Mission.fromJson(Map<String, dynamic> json) => Mission(
        id: json['id'] as int,
        incidentId: json['incidentId'] as int,
        unitType: enumFromWire(UnitType.values, json['unitType']),
        unitId: json['unitId'] as int,
        unitPlateNumber: json['unitPlateNumber'] as String? ?? '',
        status: enumFromWire(MissionStatus.values, json['status']),
        participantNames:
            (json['participantNames'] as List<dynamic>? ?? const []).cast<String>(),
        offeredAt: parseDate(json['offeredAt']),
      );

  final int id;
  final int incidentId;
  final UnitType unitType;
  final int unitId;
  final String unitPlateNumber;
  final MissionStatus status;
  final List<String> participantNames;
  final DateTime offeredAt;
}
