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
    required String address,
  }) async {
    final json = await _api.patch(
      '/api/users/$userId/profile',
      body: {
        'firstName': firstName,
        'lastName': lastName,
        'gender': gender.wire,
        'address': address,
      },
    );
    return AppUser.fromJson(asJsonMap(json));
  }

  Future<AppUser> setUnverifiedPhone(String phone) async => AppUser.fromJson(
        asJsonMap(await _api.patch('/api/users/me/phone', body: {'phone': phone})),
      );

  Future<AppUser> syncEmail() async =>
      AppUser.fromJson(asJsonMap(await _api.post('/api/users/me/sync-email')));

  Future<AppUser> syncPhone() async =>
      AppUser.fromJson(asJsonMap(await _api.post('/api/users/me/sync-phone')));
}
