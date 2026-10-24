/// The 27 governorates of Egypt (codes match the backend's `Governorate` enum).
class Governorate {
  const Governorate(this.code, this.en, this.ar);

  final String code;
  final String en;
  final String ar;

  String label(String languageCode) => languageCode == 'ar' ? ar : en;
}

const governorates = <Governorate>[
  Governorate('CAIRO', 'Cairo', 'القاهرة'),
  Governorate('GIZA', 'Giza', 'الجيزة'),
  Governorate('ALEXANDRIA', 'Alexandria', 'الإسكندرية'),
  Governorate('DAKAHLIA', 'Dakahlia', 'الدقهلية'),
  Governorate('RED_SEA', 'Red Sea', 'البحر الأحمر'),
  Governorate('BEHEIRA', 'Beheira', 'البحيرة'),
  Governorate('FAYOUM', 'Faiyum', 'الفيوم'),
  Governorate('GHARBIA', 'Gharbia', 'الغربية'),
  Governorate('ISMAILIA', 'Ismailia', 'الإسماعيلية'),
  Governorate('MONUFIA', 'Monufia', 'المنوفية'),
  Governorate('MINYA', 'Minya', 'المنيا'),
  Governorate('QALYUBIA', 'Qalyubia', 'القليوبية'),
  Governorate('NEW_VALLEY', 'New Valley', 'الوادي الجديد'),
  Governorate('SUEZ', 'Suez', 'السويس'),
  Governorate('ASWAN', 'Aswan', 'أسوان'),
  Governorate('ASSIUT', 'Assiut', 'أسيوط'),
  Governorate('BENI_SUEF', 'Beni Suef', 'بني سويف'),
  Governorate('PORT_SAID', 'Port Said', 'بورسعيد'),
  Governorate('DAMIETTA', 'Damietta', 'دمياط'),
  Governorate('SHARKIA', 'Sharqia', 'الشرقية'),
  Governorate('SOUTH_SINAI', 'South Sinai', 'جنوب سيناء'),
  Governorate('KAFR_EL_SHEIKH', 'Kafr El Sheikh', 'كفر الشيخ'),
  Governorate('MATROUH', 'Matrouh', 'مطروح'),
  Governorate('LUXOR', 'Luxor', 'الأقصر'),
  Governorate('QENA', 'Qena', 'قنا'),
  Governorate('NORTH_SINAI', 'North Sinai', 'شمال سيناء'),
  Governorate('SOHAG', 'Sohag', 'سوهاج'),
];

Governorate? governorateByCode(String? code) {
  for (final g in governorates) {
    if (g.code == code) return g;
  }
  return null;
}

enum AddressField { governorate, city, street, landmark }

enum AddressError { required, tooShort, invalid }

/// A structured address as the forms edit it. The rules are the backend's, so a value that passes here is
/// never rejected there.
class AddressValue {
  const AddressValue({this.governorate, this.city = '', this.street = '', this.landmark = ''});

  /// "15 Tahrir St, Dokki, Giza - Metro" for read-only views.
  String format(String languageCode) {
    final isArabic = languageCode == 'ar';
    final gov = governorates.where((g) => g.code == governorate).firstOrNull;
    final parts = [street.trim(), city.trim(), if (gov != null) isArabic ? gov.ar : gov.en]
        .where((part) => part.isNotEmpty);
    final line = parts.join(isArabic ? '، ' : ', ');
    final near = landmark.trim();
    return near.isEmpty ? line : '$line - $near';
  }

  factory AddressValue.fromJson(Map<String, dynamic> json) => AddressValue(
        governorate: json['governorate'] as String?,
        city: json['city'] as String? ?? '',
        street: json['street'] as String? ?? '',
        landmark: json['landmark'] as String? ?? '',
      );

  final String? governorate;
  final String city;
  final String street;
  final String landmark;

  AddressValue copyWith({String? governorate, String? city, String? street, String? landmark}) => AddressValue(
        governorate: governorate ?? this.governorate,
        city: city ?? this.city,
        street: street ?? this.street,
        landmark: landmark ?? this.landmark,
      );

  // Letters (any script), digits, spaces and . , ' / # ( ) - and the Arabic comma; at least one letter.
  static final _text = RegExp(r"^(?=.*\p{L})[\p{L}\p{N} .,'/#()\-\u060C]+$", unicode: true);

  Map<AddressField, AddressError> validate() {
    final errors = <AddressField, AddressError>{};
    final c = city.trim();
    final s = street.trim();
    final l = landmark.trim();

    if (governorate == null) errors[AddressField.governorate] = AddressError.required;

    if (c.isEmpty) {
      errors[AddressField.city] = AddressError.required;
    } else if (c.length < 2) {
      errors[AddressField.city] = AddressError.tooShort;
    } else if (!_text.hasMatch(c)) {
      errors[AddressField.city] = AddressError.invalid;
    }

    if (s.isEmpty) {
      errors[AddressField.street] = AddressError.required;
    } else if (s.length < 3) {
      errors[AddressField.street] = AddressError.tooShort;
    } else if (!_text.hasMatch(s)) {
      errors[AddressField.street] = AddressError.invalid;
    }

    if (l.isNotEmpty && !_text.hasMatch(l)) errors[AddressField.landmark] = AddressError.invalid;
    return errors;
  }

  bool get isValid => validate().isEmpty;

  /// What the backend's `AddressRequest` accepts.
  Map<String, Object?> toJson() => {
        'governorate': governorate,
        'city': city.trim(),
        'street': street.trim(),
        'landmark': landmark.trim().isEmpty ? null : landmark.trim(),
      };
}
