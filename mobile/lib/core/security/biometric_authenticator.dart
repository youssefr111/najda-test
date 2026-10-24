import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';

/// Whether this device can verify the user at all.
enum BiometricAvailability { available, unsupported }

/// The one place that knows about the `local_auth` plugin. Everything else
/// (the lock, Settings) talks to this interface, so a plugin upgrade or a test
/// double touches a single file.
abstract interface class BiometricAuthenticator {
  Future<BiometricAvailability> availability();

  /// Prompts for fingerprint / face, falling back to the device PIN, pattern or
  /// password. `true` only when the user was verified.
  Future<bool> authenticate({required String reason});
}

final biometricAuthenticatorProvider = Provider<BiometricAuthenticator>(
  (ref) => LocalAuthBiometricAuthenticator(),
);

class LocalAuthBiometricAuthenticator implements BiometricAuthenticator {
  final _auth = LocalAuthentication();

  @override
  Future<BiometricAvailability> availability() async {
    try {
      // True when a biometric OR a device credential (PIN / pattern) is set up.
      return await _auth.isDeviceSupported()
          ? BiometricAvailability.available
          : BiometricAvailability.unsupported;
    } on PlatformException {
      return BiometricAvailability.unsupported;
    }
  }

  @override
  Future<bool> authenticate({required String reason}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          // Biometrics first, but never lock someone out whose sensor fails.
          biometricOnly: false,
          // Keep the prompt alive if the app is briefly backgrounded.
          stickyAuth: true,
        ),
      );
    } on PlatformException catch (e) {
      // Not enrolled, locked out, cancelled by the system...: not verified.
      debugPrint('[Biometrics] ${e.code}: ${e.message}');
      return false;
    }
  }
}
