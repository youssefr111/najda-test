import 'dart:async';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/notifications/data/notifications_repository.dart';
import '../l10n/locale_controller.dart';
import 'push_notifications.dart';

/// Push delivery through Firebase Cloud Messaging. FCM is free and unlimited on
/// the Spark plan; the backend sends through the Admin SDK it already has.
///
/// Registration is always (token, platform, language): the backend writes each
/// push in the device's language.
class FcmPushNotificationService implements PushNotificationService {
  FcmPushNotificationService(this._ref);

  final Ref _ref;
  StreamSubscription<String>? _refreshSubscription;
  String? _registeredToken;

  FirebaseMessaging get _fcm => FirebaseMessaging.instance;

  @override
  bool get isDeliveryAvailable => true;

  @override
  Future<PushEnableResult> enable() async {
    // Android 13+ shows the "allow notifications" dialog here; earlier versions grant silently.
    final settings = await _fcm.requestPermission();
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      return PushEnableResult.permissionDenied;
    }

    await _register();
    // Tokens rotate; keep the backend's copy current without the user noticing.
    _refreshSubscription ??= _fcm.onTokenRefresh.listen(
      (token) => unawaited(_register(token)),
      onError: (Object error) => debugPrint('[Push] token refresh failed: $error'),
    );
    return PushEnableResult.enabled;
  }

  @override
  Future<void> disable() async {
    await unregisterDevice();
    await _refreshSubscription?.cancel();
    _refreshSubscription = null;
    // Drops the device from FCM itself: nothing can reach it until it is turned back on.
    await _fcm.deleteToken();
    _registeredToken = null;
  }

  @override
  Future<void> unregisterDevice() async {
    final token = _registeredToken ?? await _fcm.getToken();
    if (token == null) return;
    await _ref.read(notificationsRepositoryProvider).unregisterDevice(token);
    _registeredToken = null;
  }

  Future<void> _register([String? knownToken]) async {
    final token = knownToken ?? await _fcm.getToken();
    if (token == null) return; // FCM has not issued one yet; onTokenRefresh will deliver it
    await _ref.read(notificationsRepositoryProvider).registerDevice(
          token: token,
          platform: Platform.isIOS ? 'IOS' : 'ANDROID',
          locale: _ref.read(localeControllerProvider).languageCode,
        );
    _registeredToken = token;
  }
}
