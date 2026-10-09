import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

final locationServiceProvider = Provider<LocationService>((ref) => const LocationService());

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

/// Foreground device location: permission handling, a one-shot fix and a
/// movement stream. Kept separate from any UI.
class LocationService {
  const LocationService();

  Future<bool> ensurePermission() async {
    if (!await Geolocator.isLocationServiceEnabled()) return false;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always || permission == LocationPermission.whileInUse;
  }

  /// One high-accuracy fix, for the emergency report form.
  Future<LocationOutcome> currentPosition() async {
    try {
      if (!await ensurePermission()) return const LocationDenied();
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      return LocationFound(LatLngPosition(position.latitude, position.longitude));
    } catch (_) {
      return const LocationFailed();
    }
  }

  /// Continuous updates for shift-scoped tracking (balanced accuracy, 25 m filter).
  Stream<LatLngPosition> positionStream() => Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          distanceFilter: 25,
        ),
      ).map((p) => LatLngPosition(p.latitude, p.longitude));
}
