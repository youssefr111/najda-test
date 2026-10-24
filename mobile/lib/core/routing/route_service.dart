import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// `[longitude, latitude]` pairs along the route.
class DrivingRoute {
  const DrivingRoute({required this.coordinates, required this.distanceKm, required this.durationMin});

  final List<(double lng, double lat)> coordinates;
  final double distanceKm;
  final double durationMin;
}

/// Endpoints of a route request. A record so it works as a provider family key.
typedef RouteQuery = ({double fromLng, double fromLat, double toLng, double toLat});

// router.project-osrm.org is a free public demo server -- the same one the web
// app uses. Fine for development and demos; rate-limited, not something to
// depend on for production traffic.
/// Public OSRM-compatible routers, tried in order. The first is the project OSRM demo server (the
/// same one the web app uses); the second is FOSSGIS's. Each is a free community service, so
/// neither is guaranteed -- trying both makes "no route" far less likely.
const _routers = [
  'https://router.project-osrm.org/route/v1/driving/',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving/',
];

Future<DrivingRoute?> _fetchRoute(String baseUrl, RouteQuery query) async {
  final response = await Dio().get<Map<String, dynamic>>(
    '$baseUrl${query.fromLng},${query.fromLat};${query.toLng},${query.toLat}',
    queryParameters: {'overview': 'full', 'geometries': 'geojson'},
    options: Options(receiveTimeout: const Duration(seconds: 8), sendTimeout: const Duration(seconds: 8)),
  );
  final routes = response.data?['routes'] as List<dynamic>?;
  if (routes == null || routes.isEmpty) return null;

  final route = routes.first as Map<String, dynamic>;
  final geometry = route['geometry'] as Map<String, dynamic>;
  final coordinates = (geometry['coordinates'] as List<dynamic>).map((pair) {
    final values = pair as List<dynamic>;
    return ((values[0] as num).toDouble(), (values[1] as num).toDouble());
  }).toList();

  return DrivingRoute(
    coordinates: coordinates,
    distanceKm: (route['distance'] as num).toDouble() / 1000,
    durationMin: (route['duration'] as num).toDouble() / 60,
  );
}

/// `null` only when every router failed: callers then show a straight line and say so.
final drivingRouteProvider = FutureProvider.autoDispose.family<DrivingRoute?, RouteQuery>((ref, query) async {
  for (final router in _routers) {
    try {
      final route = await _fetchRoute(router, query);
      if (route != null) return route;
    } catch (_) {
      // try the next router
    }
  }
  return null;
});
