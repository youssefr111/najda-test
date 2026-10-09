import '../../../core/utils/wire_enum.dart';

enum UnitType implements WireEnum {
  ambulance('AMBULANCE'),
  fireTruck('FIRE_TRUCK'),
  policeCar('POLICE_CAR'),
  firstResponder('FIRST_RESPONDER');

  const UnitType(this.wire);
  @override
  final String wire;
}

enum UnitStatus implements WireEnum {
  available('AVAILABLE'),
  busy('BUSY'),
  offline('OFFLINE'),
  maintenance('MAINTENANCE');

  const UnitStatus(this.wire);
  @override
  final String wire;
}

class ResponseUnit {
  const ResponseUnit({
    required this.id,
    required this.plateNumber,
    required this.unitType,
    required this.status,
    required this.facilityLatitude,
    required this.facilityLongitude,
    required this.latitude,
    required this.longitude,
    required this.currentLeadName,
  });

  factory ResponseUnit.fromJson(Map<String, dynamic> json) => ResponseUnit(
        id: json['id'] as int,
        plateNumber: json['plateNumber'] as String?,
        unitType: enumFromWire(UnitType.values, json['unitType']),
        status: enumFromWire(UnitStatus.values, json['status']),
        facilityLatitude: (json['facilityLatitude'] as num?)?.toDouble(),
        facilityLongitude: (json['facilityLongitude'] as num?)?.toDouble(),
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        currentLeadName: json['currentLeadName'] as String?,
      );

  final int id;
  final String? plateNumber;
  final UnitType unitType;
  final UnitStatus status;
  final double? facilityLatitude;
  final double? facilityLongitude;
  final double? latitude;
  final double? longitude;
  final String? currentLeadName;

  String get displayName => plateNumber ?? '#$id';
}
