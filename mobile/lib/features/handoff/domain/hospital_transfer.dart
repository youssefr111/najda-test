import '../../../core/network/json.dart';
import '../../../core/utils/wire_enum.dart';

enum TransferStatus implements WireEnum {
  selected('SELECTED'),
  enRoute('EN_ROUTE'),
  arrived('ARRIVED');

  const TransferStatus(this.wire);
  @override
  final String wire;
}

enum ConsciousnessLevel implements WireEnum {
  alert('ALERT'),
  verbal('VERBAL'),
  pain('PAIN'),
  unresponsive('UNRESPONSIVE');

  const ConsciousnessLevel(this.wire);
  @override
  final String wire;
}

/// An ambulance mission's handoff to a hospital.
class HospitalTransfer {
  const HospitalTransfer({
    required this.id,
    required this.missionId,
    required this.hospitalId,
    required this.hospitalName,
    required this.destinationNameFreetext,
    required this.status,
  });

  factory HospitalTransfer.fromJson(Map<String, dynamic> json) =>
      HospitalTransfer(
        id: json['id'] as int,
        missionId: json['missionId'] as int,
        hospitalId: json['hospitalId'] as int?,
        hospitalName: json['hospitalName'] as String?,
        destinationNameFreetext: json['destinationNameFreetext'] as String?,
        status: enumFromWire(TransferStatus.values, json['status']),
      );

  final int id;
  final int missionId;

  /// `null` when the crew typed a destination that is not a registered hospital.
  final int? hospitalId;
  final String? hospitalName;
  final String? destinationNameFreetext;
  final TransferStatus status;

  String get destinationName => hospitalName ?? destinationNameFreetext ?? '';
}

/// A hospital from the facility list.
class Hospital {
  const Hospital({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
  });

  factory Hospital.fromJson(Map<String, dynamic> json) => Hospital(
    id: json['id'] as int,
    name: json['name'] as String? ?? '',
    latitude: (json['latitude'] as num).toDouble(),
    longitude: (json['longitude'] as num).toDouble(),
  );

  final int id;
  final String name;
  final double latitude;
  final double longitude;
}

/// The backend's ranking hint for a hospital (distance + whether to prefer it).
class HospitalCandidate {
  const HospitalCandidate({
    required this.id,
    required this.distanceKm,
    required this.recommended,
  });

  factory HospitalCandidate.fromJson(Map<String, dynamic> json) =>
      HospitalCandidate(
        id: json['id'] as int,
        distanceKm: (json['distanceKm'] as num).toDouble(),
        recommended: json['recommended'] as bool? ?? false,
      );

  final int id;
  final double distanceKm;
  final bool recommended;
}

/// A hospital as shown in the picker: list data merged with the ranking hint.
class HospitalOption {
  const HospitalOption({
    required this.hospital,
    required this.distanceKm,
    required this.recommended,
    required this.isOwnBase,
  });

  final Hospital hospital;
  final double? distanceKm;
  final bool recommended;
  final bool isOwnBase;

  int get id => hospital.id;
  String get name => hospital.name;
}

class VitalsReading {
  const VitalsReading({
    required this.id,
    required this.heartRate,
    required this.bloodPressureSystolic,
    required this.bloodPressureDiastolic,
    required this.spo2,
    required this.respiratoryRate,
    required this.temperatureCelsius,
    required this.consciousnessLevel,
    required this.notes,
    required this.recordedAt,
  });

  factory VitalsReading.fromJson(Map<String, dynamic> json) => VitalsReading(
    id: json['id'] as int,
    heartRate: json['heartRate'] as int?,
    bloodPressureSystolic: json['bloodPressureSystolic'] as int?,
    bloodPressureDiastolic: json['bloodPressureDiastolic'] as int?,
    spo2: json['spo2'] as int?,
    respiratoryRate: json['respiratoryRate'] as int?,
    temperatureCelsius: (json['temperatureCelsius'] as num?)?.toDouble(),
    consciousnessLevel: json['consciousnessLevel'] == null
        ? null
        : enumFromWire(ConsciousnessLevel.values, json['consciousnessLevel']),
    notes: json['notes'] as String?,
    recordedAt: parseDate(json['recordedAt']),
  );

  final int id;
  final int? heartRate;
  final int? bloodPressureSystolic;
  final int? bloodPressureDiastolic;
  final int? spo2;
  final int? respiratoryRate;
  final double? temperatureCelsius;
  final ConsciousnessLevel? consciousnessLevel;
  final String? notes;
  final DateTime recordedAt;

  String? get bloodPressure =>
      bloodPressureSystolic == null || bloodPressureDiastolic == null
      ? null
      : '$bloodPressureSystolic/$bloodPressureDiastolic';
}

/// Values the crew typed; every field is optional, like on the web.
class VitalsInput {
  const VitalsInput({
    required this.hospitalTransferId,
    required this.consciousnessLevel,
    this.heartRate,
    this.bloodPressureSystolic,
    this.bloodPressureDiastolic,
    this.spo2,
    this.respiratoryRate,
    this.temperatureCelsius,
    this.notes,
  });

  final int hospitalTransferId;
  final ConsciousnessLevel consciousnessLevel;
  final int? heartRate;
  final int? bloodPressureSystolic;
  final int? bloodPressureDiastolic;
  final int? spo2;
  final int? respiratoryRate;
  final double? temperatureCelsius;
  final String? notes;

  Map<String, Object?> toJson() => {
    'hospitalTransferId': hospitalTransferId,
    'heartRate': heartRate,
    'bloodPressureSystolic': bloodPressureSystolic,
    'bloodPressureDiastolic': bloodPressureDiastolic,
    'spo2': spo2,
    'respiratoryRate': respiratoryRate,
    'temperatureCelsius': temperatureCelsius,
    'consciousnessLevel': consciousnessLevel.wire,
    'notes': notes,
  };
}
