import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/l10n/l10n_x.dart';
import '../core/l10n/locale_controller.dart';
import '../core/push/notification_routes.dart';
import '../core/push/push_notifications.dart';
import '../core/router/app_router.dart';
import '../core/widgets/root_messenger.dart';
import '../features/auth/application/auth_controller.dart';
import '../features/notifications/data/notifications_repository.dart';

/// Keeps push working for the whole app:
///  * registers this device after sign-in (and when the language changes, so the
///    backend writes pushes in the right one);
///  * shows a message that arrives while the app is open as an in-app banner;
///  * opens the right screen when a notification is tapped, from the
///    background or from a cold start.
///
/// Notifications that arrive while the app is closed or in the background are
/// drawn by the OS itself (the backend sends a `notification` payload), so no
/// background handler is needed.
class PushLifecycle extends ConsumerStatefulWidget {
  const PushLifecycle({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<PushLifecycle> createState() => _PushLifecycleState();
}

class _PushLifecycleState extends ConsumerState<PushLifecycle> {
  final _subscriptions = <StreamSubscription<RemoteMessage>>[];
  Object? _lastSyncKey;
  bool _handledInitialMessage = false;

  @override
  void initState() {
    super.initState();
    _subscriptions
      ..add(FirebaseMessaging.onMessage.listen(_onForegroundMessage))
      ..add(FirebaseMessaging.onMessageOpenedApp.listen(_open));
  }

  @override
  void dispose() {
    for (final subscription in _subscriptions) {
      unawaited(subscription.cancel());
    }
    super.dispose();
  }

  // ---- registration ------------------------------------------------------------

  void _syncRegistration({required int? userId, required bool enabled}) {
    if (userId == null) return; // signed out: AuthController already unregistered the device
    if (!enabled) return; // the Settings switch removed it when it was turned off
    unawaited(() async {
      try {
        await ref.read(pushNotificationServiceProvider).enable();
      } catch (error) {
        debugPrint('[Push] registration failed (will retry next launch): $error');
      }
    }());
  }

  /// A notification tapped while the app was fully closed.
  void _handleInitialMessage() {
    if (_handledInitialMessage) return;
    _handledInitialMessage = true;
    unawaited(() async {
      final message = await FirebaseMessaging.instance.getInitialMessage();
      if (message != null && mounted) _open(message);
    }());
  }

  // ---- messages ----------------------------------------------------------------

  void _onForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    final messenger = ref.read(rootMessengerKeyProvider).currentState;
    if (notification == null || messenger == null) return;

    // A mission offer must be felt even if the screen is not being looked at.
    unawaited(HapticFeedback.mediumImpact());

    // The role may have just changed (application approved): pick it up now.
    if (message.data['type'] == 'APPLICATION_APPROVED') {
      unawaited(ref.read(authControllerProvider.notifier).refreshProfile());
    }

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 6),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (notification.title != null)
                Text(notification.title!, style: const TextStyle(fontWeight: FontWeight.w700)),
              if (notification.body != null) Text(notification.body!),
            ],
          ),
          action: SnackBarAction(label: context.l10n.pushOpen, onPressed: () => _open(message)),
        ),
      );
  }

  void _open(RemoteMessage message) {
    final user = ref.read(currentUserProvider);
    if (user == null) return;

    final data = {for (final e in message.data.entries) e.key: '${e.value}'};
    final id = int.tryParse(data['notificationId'] ?? '');
    if (id != null) {
      unawaited(ref.read(notificationsRepositoryProvider).markRead(id).catchError((Object _) {}));
    }

    ref.read(routerProvider).push(
          notificationRoute(type: data['type'] ?? '', data: data, role: user.role),
        );
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(currentUserProvider.select((user) => user?.id));
    final enabled = ref.watch(pushNotificationsEnabledProvider);
    final language = ref.watch(localeControllerProvider).languageCode;

    // (Re-)register whenever who is signed in, the switch or the language changes.
    final key = (userId, enabled, language);
    if (key != _lastSyncKey) {
      _lastSyncKey = key;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _syncRegistration(userId: userId, enabled: enabled);
      });
    }
    if (userId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _handleInitialMessage();
      });
    }
    return widget.child;
  }
}
