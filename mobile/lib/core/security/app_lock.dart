import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/domain/auth_state.dart';
import '../storage/preferences.dart';
import 'biometric_authenticator.dart';

/// What happened when the user flipped the "Biometric unlock" switch.
enum AppLockToggleResult { enabled, disabled, unsupported, notVerified }

/// The user's choice in Settings (default off). Persisted.
final appLockEnabledProvider = NotifierProvider<AppLockEnabled, bool>(
  AppLockEnabled.new,
);

class AppLockEnabled extends Notifier<bool> {
  @override
  bool build() =>
      ref.read(sharedPreferencesProvider).getBool(PrefKeys.appLockEnabled) ??
      false;

  Future<void> persist({required bool value}) async {
    state = value;
    await ref
        .read(sharedPreferencesProvider)
        .setBool(PrefKeys.appLockEnabled, value);
  }
}

/// `true` while the app is locked behind the biometric / device-credential prompt.
final appLockProvider = NotifierProvider<AppLockController, bool>(
  AppLockController.new,
);

/// Locks the app when it is opened with a saved login, and again after it has
/// been in the background for [relockAfter]. Only ever applies to a signed-in
/// session: logging in by hand never shows the lock.
///
/// The window is deliberately generous: leaving to record a video or place a
/// call must not greet the person with a lock screen on return.
class AppLockController extends Notifier<bool> {
  static const relockAfter = Duration(minutes: 2);

  DateTime? _backgroundedAt;
  bool _authenticating = false;
  bool _coldStartHandled = false;

  @override
  bool build() {
    ref
      ..listen<AuthState>(
        authControllerProvider,
        (_, next) => _onAuthChanged(next),
      )
      ..listen<bool>(appLockEnabledProvider, (_, enabled) {
        if (!enabled) state = false;
      });

    // The very first resolved auth state decides whether this launch is locked.
    return _decideColdStart(ref.read(authControllerProvider)) ?? false;
  }

  /// `null` while the session is still being restored.
  bool? _decideColdStart(AuthState auth) {
    if (auth is AuthLoading) return null;
    _coldStartHandled = true;
    final restoredSession =
        auth is Authenticated || auth is AuthCheckingProfile;
    return restoredSession && ref.read(appLockEnabledProvider);
  }

  void _onAuthChanged(AuthState auth) {
    if (!_coldStartHandled) {
      final lock = _decideColdStart(auth);
      if (lock != null) state = lock;
      return;
    }
    // Signing out ends any lock.
    if (auth is AuthUnauthenticated) state = false;
  }

  /// Called when the app goes to the background.
  void onBackgrounded() {
    if (_authenticating) return;
    _backgroundedAt ??= DateTime.now();
  }

  /// Called when the app returns to the foreground.
  void onResumed() {
    final since = _backgroundedAt;
    _backgroundedAt = null;
    if (since == null || _authenticating || state) return;
    if (!ref.read(appLockEnabledProvider)) return;
    if (ref.read(authControllerProvider) is! Authenticated) return;
    if (DateTime.now().difference(since) >= relockAfter) state = true;
  }

  /// Shows the prompt; unlocks on success.
  Future<bool> unlock({required String reason}) async {
    if (_authenticating) return false;
    _authenticating = true;
    try {
      final verified = await ref
          .read(biometricAuthenticatorProvider)
          .authenticate(reason: reason);
      if (verified && ref.mounted) state = false;
      return verified;
    } finally {
      _authenticating = false;
    }
  }

  /// Turns the lock on (after proving the device can do it and that it is really
  /// the owner) or off. Never leaves the app locked out by a failed set-up.
  Future<AppLockToggleResult> setEnabled({
    required bool enabled,
    required String reason,
  }) async {
    final setting = ref.read(appLockEnabledProvider.notifier);
    if (!enabled) {
      await setting.persist(value: false);
      state = false;
      return AppLockToggleResult.disabled;
    }

    final authenticator = ref.read(biometricAuthenticatorProvider);
    if (await authenticator.availability() ==
        BiometricAvailability.unsupported) {
      return AppLockToggleResult.unsupported;
    }

    _authenticating = true;
    try {
      if (!await authenticator.authenticate(reason: reason)) {
        return AppLockToggleResult.notVerified;
      }
    } finally {
      _authenticating = false;
    }
    await setting.persist(value: true);
    return AppLockToggleResult.enabled;
  }
}
