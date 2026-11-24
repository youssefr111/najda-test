import '../../../core/utils/wire_enum.dart';

/// Where a person is in identity verification (the backend's `KycStatus`).
enum KycStatus {
  notStarted,
  inProgress,
  inReview,
  verified,
  declined,
  expired,
  abandoned;

  static KycStatus fromJson(Object? wire) => enumFromWire(KycStatus.values, wire, fallback: KycStatus.notStarted);

  /// The provider is still working (or a person is reviewing): the screen should keep checking.
  bool get isPending => this == inProgress || this == inReview;

  /// Can start (or start again).
  bool get canStart => this != verified && this != inReview;
}

/// `GET /api/kyc/status`.
class KycState {
  const KycState({
    required this.status,
    required this.required,
    required this.verified,
    required this.declineReason,
    required this.providerConfigured,
  });

  factory KycState.fromJson(Map<String, dynamic> json) => KycState(
        status: KycStatus.fromJson(json['status']),
        required: json['required'] as bool? ?? false,
        verified: json['verified'] as bool? ?? false,
        declineReason: json['declineReason'] as String?,
        providerConfigured: json['providerConfigured'] as bool? ?? true,
      );

  final KycStatus status;

  /// Verification is REQUIRED of this person to report (the switch is on, they are not exempt or grandfathered).
  final bool required;
  final bool verified;

  /// A short generic reason from the provider ("Document expired"); never personal data.
  final String? declineReason;
  final bool providerConfigured;

  /// Reporting is blocked until they verify.
  bool get blocksReporting => required && !verified;
}
