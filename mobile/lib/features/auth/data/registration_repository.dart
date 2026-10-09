import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../domain/app_user.dart';

final registrationRepositoryProvider = Provider<RegistrationRepository>(
  (ref) => RegistrationRepository(ref.watch(apiClientProvider)),
);

class OtpSent {
  const OtpSent({required this.resendAfterSeconds, required this.expiresInSeconds});

  final int resendAfterSeconds;
  final int expiresInSeconds;
}

class OtpVerified {
  const OtpVerified({required this.verificationToken, required this.validForSeconds});

  final String verificationToken;
  final int validForSeconds;
}

/// Everything needed to create a password account in one request.
class PasswordRegistration {
  const PasswordRegistration({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.password,
    required this.verificationToken,
    required this.phone,
    required this.address,
    required this.gender,
  });

  final String firstName;
  final String lastName;
  final String email;
  final String password;
  final String verificationToken;
  final String phone; // E.164
  final String address;
  final Gender gender;

  Map<String, Object?> toJson() => {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'password': password,
        'verificationToken': verificationToken,
        'phone': phone,
        'address': address,
        'gender': gender.wire,
      };
}

/// Public registration endpoints. The flow is verify-then-create: nothing
/// exists in Firebase or the database until `registerWithPassword` succeeds.
class RegistrationRepository {
  const RegistrationRepository(this._api);

  final ApiClient _api;

  // The server calls the email provider while handling these requests, which
  // can take longer than a normal API call on a mobile connection.
  static const _slow = Duration(seconds: 30);

  Future<OtpSent> sendEmailOtp(String email) async {
    final json = asJsonMap(
      await _api.post('/api/auth/register/otp/send', body: {'email': email}, timeout: _slow),
    );
    return OtpSent(
      resendAfterSeconds: json['resendAfterSeconds'] as int,
      expiresInSeconds: json['expiresInSeconds'] as int,
    );
  }

  Future<OtpVerified> verifyEmailOtp(String email, String code) async {
    final json = asJsonMap(
      await _api.post('/api/auth/register/otp/verify', body: {'email': email, 'code': code}),
    );
    return OtpVerified(
      verificationToken: json['verificationToken'] as String,
      validForSeconds: json['validForSeconds'] as int,
    );
  }

  Future<void> registerWithPassword(PasswordRegistration registration) async {
    await _api.post(
      '/api/auth/register/citizen/password',
      body: registration.toJson(),
      timeout: _slow,
    );
  }

  /// Creates the database row for a citizen who just signed in with Google for
  /// the first time (their Firebase identity already exists).
  Future<void> registerGoogleCitizen({
    required String firstName,
    required String lastName,
    required String email,
  }) async {
    await _api.post(
      '/api/auth/register/citizen?provider=google',
      body: {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'phone': null,
        'gender': null,
        'address': null,
      },
    );
  }
}
