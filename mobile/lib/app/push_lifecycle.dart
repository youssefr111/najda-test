import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/l10n/locale_controller.dart';
import '../core/push/notification_icons.dart';
import '../core/push/notification_routes.dart';
import '../core/push/push_os_status.dart';
import '../core/push/push_notifications.dart';
import '../core/widgets/in_app_notification.dart';
import '../core/router/app_router.dart';
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

class _PushLifecycleState extends ConsumerState<PushLifecycle> with WidgetsBindingObserver {
  final _subscriptions = <StreamSubscription<RemoteMessage>>[];
  Object? _lastSyncKey;
  bool _handledInitialMessage = false;

  /// Shown in the danger colour: someone is waiting on a response.
  static const _urgentTypes = {
    'MISSION_OFFERED',
    'INCIDENT_NEW',
    'PATIENT_INCOMING',
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _subscriptions
      ..add(FirebaseMessaging.onMessage.listen(_onForegroundMessage))
      ..add(FirebaseMessaging.onMessageOpenedApp.listen(_open));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    for (final subscription in _subscriptions) {
      unawaited(subscription.cancel());
    }
    super.dispose();
  }

  /// The person may have changed the phone's notification settings while the app was away.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) ref.invalidate(pushOsAllowedProvider);
  }

  // ---- registration ------------------------------------------------------------

  void _syncRegistration({required int? userId, required bool enabled}) {
    if (userId == null) return; // signed out: AuthController already unregistered the device
    if (!enabled) return; // the Settings switch removed it when it was turned off
    unawaited(() async {
      try {
        await ref.read(pushNotificationServiceProvider).enable();
        ref.invalidate(pushOsAllowedProvider); // the permission prompt may just have been answered
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
    final title = notification?.title ?? notification?.body;
    if (notification == null || title == null) return;

    // A mission offer must be felt even if the screen is not being looked at.
    unawaited(HapticFeedback.mediumImpact());

    // The role may have just changed (application approved): pick it up now.
    if (message.data['type'] == 'APPLICATION_APPROVED') {
      unawaited(ref.read(authControllerProvider.notifier).refreshProfile());
    }

    final type = '${message.data['type'] ?? ''}';
    ref
        .read(inAppNotificationProvider.notifier)
        .show(
          title: title,
          body: notification.title == null ? null : notification.body,
          icon: notificationIcon(type),
          urgent: _urgentTypes.contains(type),
          onTap: () => _open(message),
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
