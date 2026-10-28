import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

typedef OwnPosition = ({double latitude, double longitude});

/// This phone's live position, for screens that need "where am I": a responder's route starts at their own
/// phone, not at whatever the server last heard about their unit (which can be missing for a unit that is not
/// in the crew's facility list -- "Your unit's location isn't available" while GPS was working perfectly).
///
/// Never asks for permission itself (the shift and report flows do that); emits `null` when location is off.
/// Auto-disposed: the GPS is only listened to while a screen that shows it is open.
final ownPositionProvider = StreamProvider.autoDispose<OwnPosition?>((ref) async* {
  try {
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      yield null;
      return;
    }
    if (!await Geolocator.isLocationServiceEnabled()) {
      yield null;
      return;
    }

    final last = await Geolocator.getLastKnownPosition();
    if (last != null) yield (latitude: last.latitude, longitude: last.longitude);

    yield* Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 20),
    ).map<OwnPosition?>((p) => (latitude: p.latitude, longitude: p.longitude));
  } catch (_) {
    yield null;
  }
});
