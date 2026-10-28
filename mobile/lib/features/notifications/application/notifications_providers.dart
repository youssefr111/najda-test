import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/live/live_stream.dart';
import '../../../core/live/stomp_hub.dart';
import '../../auth/application/auth_controller.dart';
import '../data/notifications_repository.dart';
import '../domain/app_notification.dart';

/// The newest notifications, refreshed the moment the backend nudges
/// `/topic/users/{id}/notifications` (so a new one appears without pulling).
final notificationsPageProvider = StreamProvider.autoDispose<NotificationPage>((
  ref,
) {
  final userId = ref.watch(currentUserProvider.select((user) => user?.id));
  if (userId == null) return const Stream.empty();

  return liveStream(
    hub: ref.watch(stompHubProvider),
    topics: ['/topic/users/$userId/notifications'],
    fetch: () => ref.read(notificationsRepositoryProvider).list(),
  );
});

/// Live unread count for the bell.
final unreadNotificationsStreamProvider = StreamProvider.autoDispose<int>((
  ref,
) {
  final userId = ref.watch(currentUserProvider.select((user) => user?.id));
  if (userId == null) return const Stream.empty();

  return liveStream(
    hub: ref.watch(stompHubProvider),
    topics: ['/topic/users/$userId/notifications'],
    fetch: () => ref.read(notificationsRepositoryProvider).unreadCount(),
  );
});

/// Drives the dot on the bell: shown only when something is genuinely unread.
final unreadNotificationCountProvider = Provider.autoDispose<int>(
  (ref) => ref.watch(unreadNotificationsStreamProvider).value ?? 0,
);
