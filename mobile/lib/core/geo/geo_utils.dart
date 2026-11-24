import 'dart:math';

/// المسافة بالمتر بين نقطتين (Haversine).
double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
  const earthRadius = 6371000.0;
  double rad(double degrees) => degrees * pi / 180;

  final dLat = rad(lat2 - lat1);
  final dLon = rad(lon2 - lon1);
  final a =
      pow(sin(dLat / 2), 2) +
      cos(rad(lat1)) * cos(rad(lat2)) * pow(sin(dLon / 2), 2);

  return 2 * earthRadius * asin(sqrt(a));
}
