import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/preferences.dart';
import 'fcm_push_service.dart';

/// What happened when push was switched on.
enum PushEnableResult { enabled, permissionDenied }

/// Delivery of push notifications to this device. The Settings switch, the saved
/// preference and everything that reads it are independent of *how* pushes
/// arrive; only the implementation (Firebase Cloud Messaging, free on the Spark
/// plan) knows.
abstract interface class PushNotificationService {
  /// `false` for a build/service that cannot deliver; Settings is then honest about it.
  bool get isDeliveryAvailable;

  /// Asks the OS for permission (if needed) and registers this device with the
  /// backend. Idempotent: safe to call on every launch and after a language change.
  Future<PushEnableResult> enable();

  /// The user switched push off: unregister this device and drop its token.
  Future<void> disable();

  /// Sign-out: stop pushes for the *outgoing* user on this device, keeping the
  /// choice and the token so the next sign-in registers again.
  Future<void> unregisterDevice();
}

/// A service that delivers nothing (tests, or a build without Firebase).
class NoopPushNotificationService implements PushNotificationService {
  const NoopPushNotificationService();

  @override
  bool get isDeliveryAvailable => false;

  @override
  Future<PushEnableResult> enable() async => PushEnableResult.enabled;

  @override
  Future<void> disable() async {}

  @override
  Future<void> unregisterDevice() async {}
}

final pushNotificationServiceProvider = Provider<PushNotificationService>(
  (ref) => FcmPushNotificationService(ref),
);

/// The user's "Push notifications" choice (default on), persisted.
final pushNotificationsEnabledProvider = NotifierProvider<PushNotificationsPreference, bool>(
  PushNotificationsPreference.new,
);

class PushNotificationsPreference extends Notifier<bool> {
  @override
  bool build() => ref.read(sharedPreferencesProvider).getBool(PrefKeys.pushNotifications) ?? true;

  /// Saves the choice and applies it. Turning on can be refused by the OS
  /// (permission blocked); then the choice stays off and the caller is told why.
  Future<PushEnableResult> setEnabled({required bool enabled}) async {
    final service = ref.read(pushNotificationServiceProvider);
    var result = PushEnableResult.enabled;

    try {
      if (enabled) {
        result = await service.enable();
      } else {
        await service.disable();
      }
    } catch (error) {
      // Typically no connection: the choice is still saved and re-applied on the next launch.
      debugPrint('[Push] ${enabled ? 'enable' : 'disable'} failed: $error');
    }

    final effective = enabled && result == PushEnableResult.enabled;
    state = effective;
    await ref.read(sharedPreferencesProvider).setBool(PrefKeys.pushNotifications, effective);
    return result;
  }
}
