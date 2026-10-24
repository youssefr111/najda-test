import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';

import '../auth/google_sign_in_failure.dart';
import '../config/flavor.dart';
import '../l10n/l10n_x.dart';
import '../network/api_exception.dart';

/// Turns any error thrown by Firebase, the API layer, or app code into
/// user-facing, translated copy. [byStatus] lets a screen override specific
/// HTTP statuses with a more precise message (409 = already registered, ...).
String describeError(
  AppLocalizations l10n,
  Object error, {
  Map<int, String> byStatus = const {},
}) {
  if (error is ApiException) {
    return byStatus[error.status] ?? error.message;
  }
  if (error is GoogleSignInFailure) {
    final message = error.isNetwork
        ? l10n.authErrorsNetwork
        : l10n.authErrorsGoogle;
    // Test and local builds also show Google's own code, so a misconfigured
    // SHA-1 / client id is obvious; production users never see it.
    return Flavor.current.isProduction ? message : '$message (${error.label})';
  }
  if (error is FirebaseAuthException) {
    return switch (error.code) {
      'invalid-email' => l10n.authErrorsInvalidEmail,
      'user-disabled' => l10n.authErrorsUserDisabled,
      'user-not-found' ||
      'wrong-password' ||
      'invalid-credential' => l10n.authErrorsInvalidCredential,
      'email-already-in-use' => l10n.authErrorsEmailAlreadyInUse,
      'weak-password' => l10n.authErrorsWeakPassword,
      'too-many-requests' => l10n.authErrorsTooManyRequests,
      'network-request-failed' => l10n.authErrorsNetwork,
      'popup-closed-by-user' ||
      'cancelled-popup-request' => l10n.authErrorsCancelled,
      'account-exists-with-different-credential' =>
        l10n.authErrorsAccountExistsDifferentCredential,
      _ =>
        Flavor.current.isProduction
            ? l10n.authErrorsGeneric
            : '${l10n.authErrorsGeneric} (${error.code})',
    };
  }
  if (error is TimeoutException) return l10n.authErrorsNetwork;
  return l10n.authErrorsGeneric;
}
