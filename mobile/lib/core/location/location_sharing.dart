import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../storage/preferences.dart';

/// Why location may (not) be usable right now.
enum LocationReadiness {
  /// Allowed by the user, permitted by the OS, and the GPS is on.
  ready,

  /// The user turned location sharing off in NAJDA's settings.
  off,

  /// Not yet granted; asking again is possible.
  permissionNeeded,

  /// Blocked in the OS: only the system settings screen can fix it.
  permissionBlocked,

  /// Permission is fine but the device's location services are switched off.
  serviceDisabled,
}

/// The citizen's own switch in Settings. When off, NAJDA stops pre-locating
/// them in the background; an emergency report still asks for a fix when it is
/// actually needed, because an SOS must always be able to work.
final locationSharingProvider =
    NotifierProvider<LocationSharingController, bool>(
      LocationSharingController.new,
    );

class LocationSharingController extends Notifier<bool> {
  @override
  bool build() =>
      ref.read(sharedPreferencesProvider).getBool(PrefKeys.locationSharing) ??
      true;

  /// Applies the user's choice and reports what the OS allows, so the UI can
  /// explain a failure. Turning on never succeeds without OS permission.
  Future<LocationReadiness> setEnabled({required bool enabled}) async {
    if (!enabled) {
      await _persist(value: false);
      return LocationReadiness.off;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      return LocationReadiness.permissionBlocked;
    }
    if (permission == LocationPermission.denied) {
      return LocationReadiness.permissionNeeded;
    }

    await _persist(value: true);
    return await Geolocator.isLocationServiceEnabled()
        ? LocationReadiness.ready
        : LocationReadiness.serviceDisabled;
  }

  Future<void> _persist({required bool value}) async {
    state = value;
    await ref
        .read(sharedPreferencesProvider)
        .setBool(PrefKeys.locationSharing, value);
  }
}

/// Live view of [LocationReadiness]. Re-checks whenever the app returns to the
/// foreground, so fixing a permission in system settings is picked up at once.
final locationReadinessProvider = FutureProvider.autoDispose<LocationReadiness>(
  (ref) async {
    final listener = AppLifecycleListener(onResume: () => ref.invalidateSelf());
    ref.onDispose(listener.dispose);

    if (!ref.watch(locationSharingProvider)) return LocationReadiness.off;

    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.deniedForever) {
      return LocationReadiness.permissionBlocked;
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.unableToDetermine) {
      return LocationReadiness.permissionNeeded;
    }
    if (!await Geolocator.isLocationServiceEnabled()) {
      return LocationReadiness.serviceDisabled;
    }
    return LocationReadiness.ready;
  },
);
