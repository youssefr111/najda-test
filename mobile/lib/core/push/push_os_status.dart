import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Whether Android lets NAJDA show notifications at all (phone Settings > Apps > NAJDA > Notifications).
///
/// This is separate from the in-app Settings switch on purpose. A push reaches the app whether or not the phone
/// allows notifications, so while the app is open the in-app banner works either way. Once the app is in the
/// background or closed, only the phone can draw a notification: if it is blocked, nothing appears, and the in-app
/// switch (which only says whether the app asked for pushes) cannot tell. Refreshed whenever the app comes back to
/// the foreground, since the person changes it in the phone's settings.
final pushOsAllowedProvider = FutureProvider<bool>((ref) async {
  try {
    final settings = await FirebaseMessaging.instance.getNotificationSettings();
    return settings.authorizationStatus != AuthorizationStatus.denied;
  } catch (_) {
    return true; // cannot tell: do not warn about something we cannot confirm
  }
});