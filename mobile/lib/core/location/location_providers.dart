import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'location_service.dart';

/// Current location for the emergency-report screen.
///
/// If the user needs to change system settings, retry automatically
/// when they return to the app. The screen must keep watching this
/// provider for the automatic retry to remain active.
final currentLocationProvider = FutureProvider.autoDispose<LocationOutcome>((
  ref,
) async {
  var retryOnResume = false;

  final listener = AppLifecycleListener(
    onResume: () {
      if (retryOnResume) {
        ref.invalidateSelf();
      }
    },
  );

  ref.onDispose(listener.dispose);

  final outcome = await ref.read(locationServiceProvider).currentPosition();

  retryOnResume =
      outcome is LocationPermissionPermanentlyDenied ||
      outcome is LocationServiceDisabled;

  return outcome;
});

/// Prewarms location when a citizen logs in.
/// Errors are ignored here; the report screen handles them.
final locationPrepProvider = FutureProvider<void>((ref) async {
  try {
    await ref.read(locationServiceProvider).currentPosition();
  } catch (_) {
    // Location errors are handled when the citizen opens the report.
  }
});
