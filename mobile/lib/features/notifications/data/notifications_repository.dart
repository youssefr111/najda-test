import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../domain/app_notification.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>(
  (ref) => NotificationsRepository(ref.watch(apiClientProvider)),
);

/// The notification inbox and this device's push registration.
class NotificationsRepository {
  const NotificationsRepository(this._api);

  final ApiClient _api;

  static const _base = '/api/notifications';

  Future<NotificationPage> list({int? before, int limit = 30}) async =>
      NotificationPage.fromJson(
        asJsonMap(
          await _api.get(
            '$_base?limit=$limit${before == null ? '' : '&before=$before'}',
          ),
        ),
      );

  Future<int> unreadCount() async =>
      (asJsonMap(await _api.get('$_base/unread-count'))['unreadCount'] as num?)
          ?.toInt() ??
      0;

  Future<void> markRead(int id) => _api.post('$_base/$id/read');

  Future<void> markAllRead() => _api.post('$_base/read-all');

  /// Idempotent: safe on every launch. [platform] is `ANDROID` or `IOS`.
  Future<void> registerDevice({
    required String token,
    required String platform,
    required String locale,
  }) => _api.post(
    '$_base/devices',
    body: {'token': token, 'platform': platform, 'locale': locale},
  );

  Future<void> unregisterDevice(String token) =>
      _api.delete('$_base/devices?token=${Uri.encodeQueryComponent(token)}');
}
