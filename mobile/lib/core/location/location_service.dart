import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

final locationServiceProvider = Provider<LocationService>(
  (ref) => const LocationService(),
);

class LatLngPosition {
  const LatLngPosition(this.latitude, this.longitude);

  final double latitude;
  final double longitude;
}

sealed class LocationOutcome {
  const LocationOutcome();
}

final class LocationFound extends LocationOutcome {
  const LocationFound(this.position);

  final LatLngPosition position;
}

final class LocationDenied extends LocationOutcome {
  const LocationDenied();
}

final class LocationFailed extends LocationOutcome {
  const LocationFailed();
}

final class LocationPermissionPermanentlyDenied extends LocationOutcome {
  const LocationPermissionPermanentlyDenied();
}

final class LocationServiceDisabled extends LocationOutcome {
  const LocationServiceDisabled();
}

final class LocationService {
  const LocationService();

  static const _maxAccuracyMeters = 1000.0;
  static const _fastPathMaxAge = Duration(seconds: 30);
  static const _fallbackMaxAge = Duration(minutes: 2);
  static const _requestTimeout = Duration(seconds: 15);

  bool _isFresh(Position position, Duration maxAge) {
    final age = DateTime.now().difference(position.timestamp);
    return !age.isNegative && age <= maxAge;
  }

  bool _isAcceptable(Position position) {
    return position.accuracy.isFinite &&
        position.accuracy >= 0 &&
        position.accuracy <= _maxAccuracyMeters &&
        position.latitude.isFinite &&
        position.longitude.isFinite &&
        position.latitude >= -90 &&
        position.latitude <= 90 &&
        position.longitude >= -180 &&
        position.longitude <= 180 &&
        !position.isMocked;
  }

  /// Checks/request permissions without confusing disabled GPS
  /// with denied permission.
  Future<bool> ensurePermission() async {
    var permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    return permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
  }

  /// Opens device location settings.
  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  /// Opens this application's settings.
  Future<void> openAppSettings() async {
    await Geolocator.openAppSettings();
  }

  /// Gets a fresh location when possible, with a validated cached fallback.
  Future<LocationOutcome> currentPosition() async {
    try {
      // 1. Handle permission first.
      var permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.deniedForever) {
        return const LocationPermissionPermanentlyDenied();
      }

      if (permission == LocationPermission.denied) {
        return const LocationDenied();
      }

      // 2. Check whether device location is enabled.
      if (!await Geolocator.isLocationServiceEnabled()) {
        return const LocationServiceDisabled();
      }

      // 3. Use a fresh, acceptable cached position if available.
      Position? last;
      try {
        last = await Geolocator.getLastKnownPosition();
      } catch (e) {
        debugPrint('[Location] Last-known lookup failed: $e');
      }

      if (last != null &&
          _isFresh(last, _fastPathMaxAge) &&
          _isAcceptable(last)) {
        return LocationFound(LatLngPosition(last.latitude, last.longitude));
      }

      // 4. Try to obtain a new position.
      Position? position;

      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: _requestTimeout,
          ),
        ).timeout(_requestTimeout);
      } catch (e) {
        debugPrint('[Location] Current position failed: $e');

        // 5. Only use a recent cached fallback.
        if (last != null &&
            _isFresh(last, _fallbackMaxAge) &&
            _isAcceptable(last)) {
          position = last;
        }
      }

      if (position == null) {
        return const LocationFailed();
      }

      // 6. Validate the result before returning it.
      if (position.isMocked) {
        debugPrint('[Location] Mock location rejected');
        return const LocationFailed();
      }

      if (!_isAcceptable(position)) {
        debugPrint(
          '[Location] Invalid or inaccurate position: '
          '${position.accuracy} meters',
        );
        return const LocationFailed();
      }

      return LocationFound(
        LatLngPosition(position.latitude, position.longitude),
      );
    } catch (e) {
      debugPrint('[Location] Failed to get position: $e');
      return const LocationFailed();
    }
  }

  /// Continuous updates for responder tracking.
  Stream<LatLngPosition> positionStream() {
    return Geolocator.getPositionStream(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            distanceFilter: 25,
          ),
        )
        .where(_isAcceptable)
        .map(
          (position) => LatLngPosition(position.latitude, position.longitude),
        );
  }
}
