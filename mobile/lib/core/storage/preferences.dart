import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Overridden in `bootstrap()` with the already-loaded instance, so every
/// consumer can read it synchronously.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider not overridden'),
);

abstract final class PrefKeys {
  static const locale = 'najda-locale';
  static const theme = 'najda-theme';

  /// The e-mail last used to sign in, so the login form can pre-fill it.
  static const lastEmail = 'najda-last-email';

  /// Whether the citizen allows NAJDA to use their location (default on).
  static const locationSharing = 'najda-location-sharing';

  /// Prefix of the saved "become a responder" motivation text (suffixed with the user id).
  static const responderApplicationDraft = 'najda-responder-draft';

  /// Biometric / device-credential app lock (default off).
  static const appLockEnabled = 'najda-app-lock';

  /// Whether the user wants push notifications (default on).
  static const pushNotifications = 'najda-push-notifications';

  /// Last good copy of the backend's incident-location rules (offline fallback).
  static const incidentLocationConfig = 'najda-incident-location-config';
  
  /// The version the snackbar already announced, so it appears once per release.
  static const updateAnnouncedVersion = 'najda-update-announced';

  /// Last good copy of the safety guidance (offline fallback).
  static const guidanceContent = 'najda-guidance-content';

  /// Last good copy of a legal document (offline fallback), per document slug.
  static String legalDocument(String slug) => 'najda-legal-$slug';
}
