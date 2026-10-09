import '../../../core/network/json.dart';
import '../../../core/utils/wire_enum.dart';
import 'role.dart';

enum Gender {
  male,
  female;

  static Gender? fromJsonOrNull(Object? wire) =>
      wire == null ? null : enumFromWire(Gender.values, wire);

  String get wire => enumToWire(this);
}

/// Mirrors the backend's `UserResponse` (GET /api/auth/me).
class AppUser {
  const AppUser({
    required this.id,
    required this.firebaseUid,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.emailVerified,
    required this.phone,
    required this.phoneVerified,
    required this.address,
    required this.role,
    required this.facilityId,
    required this.facilityName,
    required this.gender,
    required this.profileCompleted,
    required this.enabled,
    required this.createdAt,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as int,
        firebaseUid: json['firebaseUid'] as String,
        firstName: json['firstName'] as String,
        lastName: json['lastName'] as String,
        email: json['email'] as String,
        emailVerified: json['emailVerified'] as bool? ?? false,
        phone: json['phone'] as String?,
        phoneVerified: json['phoneVerified'] as bool? ?? false,
        address: json['address'] as String?,
        role: Role.fromJson(json['roleName']),
        facilityId: json['facilityId'] as int?,
        facilityName: json['facilityName'] as String?,
        gender: Gender.fromJsonOrNull(json['gender']),
        profileCompleted: json['profileCompleted'] as bool? ?? false,
        enabled: json['enabled'] as bool? ?? true,
        createdAt: parseDate(json['createdAt']),
      );

  final int id;
  final String firebaseUid;
  final String firstName;
  final String lastName;
  final String email;
  final bool emailVerified;
  final String? phone;
  final bool phoneVerified;
  final String? address;
  final Role role;
  final int? facilityId;
  final String? facilityName;
  final Gender? gender;
  final bool profileCompleted;
  final bool enabled;
  final DateTime createdAt;

  String get fullName => '$firstName $lastName'.trim();

  String get initials {
    final first = firstName.isEmpty ? '' : firstName[0];
    final last = lastName.isEmpty ? '' : lastName[0];
    final value = '$first$last'.toUpperCase();
    return value.isEmpty ? '?' : value;
  }

  bool get hasVerifiedPhone => (phone?.isNotEmpty ?? false) && phoneVerified;
}
