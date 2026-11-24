import '../../responder/domain/unit.dart';

/// Arrival-time estimate for the citizen's tracking screen -- the same model the web uses (`lib/dispatch/eta.ts`).
///
/// The old estimate was straight-line distance / a flat speed. That is optimistic twice over: streets are not
/// straight lines, and a short urban hop is far slower than a highway run. This corrects both. (Citizens do not
/// get real routing -- only the responders do -- so this stays an estimate, and the UI presents it as one.)
///
/// The constants are engineering judgement for a dense city, not measured data: tune them against real
/// accepted-to-arrived times once there are enough missions.

/// Straight-line distance -> road distance. City street networks typically add 30-50%.
const _roadCircuity = 1.35;

/// Minutes before wheels roll (crew alerted, unit leaves) plus the last-metres approach.
const _turnoutMinutes = 1.0;

/// Average speed (km/h) over a trip of this ROAD length: short urban trips are slow, longer ones reach faster roads.
double _averageSpeedKmh(double roadKm, UnitType type) {
  final base = roadKm < 3
      ? 28.0
      : roadKm < 10
          ? 36.0
          : roadKm < 25
              ? 45.0
              : 60.0;
  // Lights and sirens let emergency vehicles move through traffic faster than ordinary cars.
  final priority = type == UnitType.firstResponder ? 1.0 : 1.15;
  return base * priority;
}

/// Whole minutes (at least 1) for [type] to cover [distanceMeters] as the crow flies.
int estimatedArrivalMinutes(UnitType type, double distanceMeters) {
  final roadKm = (distanceMeters / 1000) * _roadCircuity;
  final minutes = _turnoutMinutes + (roadKm / _averageSpeedKmh(roadKm, type)) * 60;
  return minutes.round().clamp(1, 999);
}
