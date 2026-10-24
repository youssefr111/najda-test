import '../../../core/address/address.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../../auth/domain/app_user.dart';

final userRepositoryProvider = Provider<UserRepository>(
  (ref) => UserRepository(ref.watch(apiClientProvider)),
);

/// Profile-related backend calls. Each mutation returns the updated user so
/// callers can push it straight into the session.
class UserRepository {
  const UserRepository(this._api);

  final ApiClient _api;

  Future<AppUser> fetchMe() async =>
      AppUser.fromJson(asJsonMap(await _api.get('/api/auth/me')));

  Future<AppUser> updateProfile(
    int userId, {
    required String firstName,
    required String lastName,
    required Gender gender,
    required AddressValue address,
  }) async {
    final json = await _api.patch(
      '/api/users/$userId/profile',
      body: {
        'firstName': firstName,
        'lastName': lastName,
        'gender': gender.wire,
        'addressDetails': address.toJson(),
      },
    );
    return AppUser.fromJson(asJsonMap(json));
  }

  /// Completes a new account's profile in ONE atomic request (name, gender, address and,
  /// unless a verified number is already on file, the phone). Never split this into separate
  /// profile / phone calls: sent together they used to overwrite each other on the server.
  Future<AppUser> completeProfile({
    required String firstName,
    required String lastName,
    required Gender gender,
    required AddressValue address,
    String? phone,
  }) async =>
      AppUser.fromJson(
        asJsonMap(
          await _api.patch(
            '/api/users/me/complete-profile',
            body: {
              'firstName': firstName,
              'lastName': lastName,
              'gender': gender.wire,
              'addressDetails': address.toJson(),
              'phone': ?phone,
            },
          ),
        ),
      );

  Future<AppUser> setUnverifiedPhone(String phone) async => AppUser.fromJson(
        asJsonMap(await _api.patch('/api/users/me/phone', body: {'phone': phone})),
      );

  Future<AppUser> syncEmail() async =>
      AppUser.fromJson(asJsonMap(await _api.post('/api/users/me/sync-email')));

  Future<AppUser> syncPhone() async =>
      AppUser.fromJson(asJsonMap(await _api.post('/api/users/me/sync-phone')));
}
