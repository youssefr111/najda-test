import '../../../core/utils/wire_enum.dart';

/// Backend @Size limits -- the form enforces the same ones.
const maxEmergencyContacts = 3;
const maxNotesLength = 500;
const maxContactNameLength = 100;
const minWeightKg = 1;
const maxWeightKg = 500;

/// A medical profile that was last updated this long ago is flagged for review.
const medicalProfileStaleAfterMonths = 6;

/// ABO/Rh blood group. Wire codes match the backend (`A_POSITIVE`...).
enum BloodType implements WireEnum {
  aPositive('A_POSITIVE'),
  aNegative('A_NEGATIVE'),
  bPositive('B_POSITIVE'),
  bNegative('B_NEGATIVE'),
  abPositive('AB_POSITIVE'),
  abNegative('AB_NEGATIVE'),
  oPositive('O_POSITIVE'),
  oNegative('O_NEGATIVE');

  const BloodType(this.wire);

  @override
  final String wire;

  static BloodType fromWire(Object? wire) => enumFromWire(values, wire);
}

/// Quick-pick allergies (the same list as the web app and backend).
enum Allergy implements WireEnum {
  penicillin('PENICILLIN'),
  sulfa('SULFA'),
  aspirin('ASPIRIN'),
  nsaids('NSAIDS'),
  codeine('CODEINE'),
  contrastDye('CONTRAST_DYE'),
  peanuts('PEANUTS'),
  treeNuts('TREE_NUTS'),
  eggs('EGGS'),
  milk('MILK'),
  shellfish('SHELLFISH'),
  latex('LATEX'),
  insectStings('INSECT_STINGS');

  const Allergy(this.wire);

  @override
  final String wire;

  static Allergy fromWire(Object? wire) => enumFromWire(values, wire);
}

/// Quick-pick medical conditions (the same list as the web app and backend).
enum MedicalCondition implements WireEnum {
  asthma('ASTHMA'),
  diabetesType1('DIABETES_TYPE_1'),
  diabetesType2('DIABETES_TYPE_2'),
  epilepsy('EPILEPSY'),
  heartDisease('HEART_DISEASE'),
  hypertension('HYPERTENSION'),
  strokeHistory('STROKE_HISTORY'),
  kidneyDisease('KIDNEY_DISEASE'),
  pacemakerOrImplant('PACEMAKER_OR_IMPLANT'),
  onBloodThinners('ON_BLOOD_THINNERS'),
  pregnancy('PREGNANCY'),
  g6pdDeficiency('G6PD_DEFICIENCY');

  const MedicalCondition(this.wire);

  @override
  final String wire;

  static MedicalCondition fromWire(Object? wire) => enumFromWire(values, wire);
}

/// How an emergency contact is related to the patient.
enum ContactRelationship implements WireEnum {
  parent('PARENT'),
  spouse('SPOUSE'),
  sibling('SIBLING'),
  child('CHILD'),
  relative('RELATIVE'),
  friend('FRIEND'),
  other('OTHER');

  const ContactRelationship(this.wire);

  @override
  final String wire;

  static ContactRelationship fromWire(Object? wire) =>
      enumFromWire(values, wire);
}

/// Someone to call about the patient. The first contact is the primary one.
class EmergencyContact {
  const EmergencyContact({
    required this.name,
    required this.relationship,
    required this.phone,
  });

  factory EmergencyContact.fromJson(Map<String, dynamic> json) =>
      EmergencyContact(
        name: json['name'] as String,
        relationship: ContactRelationship.fromWire(json['relationship']),
        phone: json['phone'] as String,
      );

  final String name;
  final ContactRelationship relationship;

  /// E.164, e.g. `+201012345678`.
  final String phone;

  Map<String, Object?> toJson() => {
    'name': name,
    'relationship': relationship.wire,
    'phone': phone,
  };
}

/// The user's own medical profile (`/api/users/me/medical-profile`).
///
/// "No known allergies / conditions" is an explicit statement, different from
/// simply not having filled the list in -- so it is stored separately.
class MedicalProfile {
  const MedicalProfile({
    this.dateOfBirth,
    this.weightKg,
    this.bloodType,
    this.noKnownAllergies = false,
    this.allergies = const {},
    this.allergyNotes,
    this.noKnownConditions = false,
    this.conditions = const {},
    this.conditionNotes,
    this.currentMedications,
    this.medicalNotes,
    this.emergencyContacts = const [],
    this.shareWithResponders = false,
    this.updatedAt,
  });

  factory MedicalProfile.fromJson(Map<String, dynamic> json) => MedicalProfile(
    dateOfBirth: json['dateOfBirth'] == null
        ? null
        : DateTime.parse(json['dateOfBirth'] as String),
    weightKg: (json['weightKg'] as num?)?.toDouble(),
    bloodType: json['bloodType'] == null
        ? null
        : BloodType.fromWire(json['bloodType']),
    noKnownAllergies: json['noKnownAllergies'] as bool? ?? false,
    allergies: {
      for (final a in (json['allergies'] as List<dynamic>? ?? const []))
        Allergy.fromWire(a),
    },
    allergyNotes: json['allergyNotes'] as String?,
    noKnownConditions: json['noKnownConditions'] as bool? ?? false,
    conditions: {
      for (final c in (json['conditions'] as List<dynamic>? ?? const []))
        MedicalCondition.fromWire(c),
    },
    conditionNotes: json['conditionNotes'] as String?,
    currentMedications: json['currentMedications'] as String?,
    medicalNotes: json['medicalNotes'] as String?,
    emergencyContacts: [
      for (final c in (json['emergencyContacts'] as List<dynamic>? ?? const []))
        EmergencyContact.fromJson(Map<String, dynamic>.from(c as Map)),
    ],
    shareWithResponders: json['shareWithResponders'] as bool? ?? false,
    updatedAt: json['updatedAt'] == null
        ? null
        : DateTime.parse(json['updatedAt'] as String).toLocal(),
  );

  /// What a user who has not filled anything in yet has.
  static const empty = MedicalProfile();

  /// Date only (no time of day).
  final DateTime? dateOfBirth;
  final double? weightKg;
  final BloodType? bloodType;
  final bool noKnownAllergies;
  final Set<Allergy> allergies;
  final String? allergyNotes;
  final bool noKnownConditions;
  final Set<MedicalCondition> conditions;
  final String? conditionNotes;
  final String? currentMedications;
  final String? medicalNotes;
  final List<EmergencyContact> emergencyContacts;

  /// Standing consent for responders to see this profile when the user reports an emergency.
  final bool shareWithResponders;
  final DateTime? updatedAt;

  /// Sharing consent alone does not make a profile non-empty: it has to hold
  /// actual information.
  bool get isEmpty =>
      dateOfBirth == null &&
      weightKg == null &&
      bloodType == null &&
      !noKnownAllergies &&
      allergies.isEmpty &&
      _blank(allergyNotes) &&
      !noKnownConditions &&
      conditions.isEmpty &&
      _blank(conditionNotes) &&
      _blank(currentMedications) &&
      _blank(medicalNotes) &&
      emergencyContacts.isEmpty;

  /// Whole years, or `null` without a date of birth.
  int? ageAt(DateTime now) {
    final born = dateOfBirth;
    if (born == null) return null;
    final hadBirthday =
        now.month > born.month ||
        (now.month == born.month && now.day >= born.day);
    return now.year - born.year - (hadBirthday ? 0 : 1);
  }

  /// Whole calendar months since the last update, or `null` if never saved.
  int? monthsSinceUpdate(DateTime now) {
    final updated = updatedAt;
    if (updated == null) return null;
    return (now.year - updated.year) * 12 + (now.month - updated.month);
  }

  bool isStale(DateTime now) =>
      (monthsSinceUpdate(now) ?? 0) >= medicalProfileStaleAfterMonths;

  /// `UpdateMedicalProfileRequest`: a full replacement, not a patch.
  Map<String, Object?> toRequestJson() => {
    'dateOfBirth': dateOfBirth == null ? null : _isoDate(dateOfBirth!),
    // The backend accepts at most one decimal.
    'weightKg': weightKg == null
        ? null
        : double.parse(weightKg!.toStringAsFixed(1)),
    'bloodType': bloodType?.wire,
    'noKnownAllergies': noKnownAllergies,
    'allergies': [for (final a in allergies) a.wire],
    'allergyNotes': _trimmedOrNull(allergyNotes),
    'noKnownConditions': noKnownConditions,
    'conditions': [for (final c in conditions) c.wire],
    'conditionNotes': _trimmedOrNull(conditionNotes),
    'currentMedications': _trimmedOrNull(currentMedications),
    'medicalNotes': _trimmedOrNull(medicalNotes),
    'emergencyContacts': [for (final c in emergencyContacts) c.toJson()],
    'shareWithResponders': shareWithResponders,
  };

  static bool _blank(String? text) => text == null || text.trim().isEmpty;
  static String? _trimmedOrNull(String? text) =>
      _blank(text) ? null : text!.trim();

  static String _isoDate(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

/// What the people treating a patient get for an incident
/// (`/api/incidents/{id}/medical-profile`).
class IncidentMedicalProfile {
  const IncidentMedicalProfile({required this.shared, this.profile});

  factory IncidentMedicalProfile.fromJson(Map<String, dynamic> json) =>
      IncidentMedicalProfile(
        shared: json['shared'] as bool? ?? false,
        profile: json['profile'] == null
            ? null
            : MedicalProfile.fromJson(
                Map<String, dynamic>.from(json['profile'] as Map),
              ),
      );

  /// False when the patient has not allowed (or has since withdrawn) sharing.
  final bool shared;
  final MedicalProfile? profile;
}
