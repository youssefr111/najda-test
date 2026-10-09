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
final drivingRouteProvider =
    FutureProvider.autoDispose.family<DrivingRoute?, RouteQuery>((ref, query) async {
  try {
    final response = await Dio().get<Map<String, dynamic>>(
      'https://router.project-osrm.org/route/v1/driving/'
      '${query.fromLng},${query.fromLat};${query.toLng},${query.toLat}',
      queryParameters: {'overview': 'full', 'geometries': 'geojson'},
      options: Options(receiveTimeout: const Duration(seconds: 10)),
    );
    final routes = response.data?['routes'] as List<dynamic>?;
    if (routes == null || routes.isEmpty) return null;

    final route = routes.first as Map<String, dynamic>;
    final geometry = route['geometry'] as Map<String, dynamic>;
    final coordinates = (geometry['coordinates'] as List<dynamic>)
        .map((pair) {
          final values = pair as List<dynamic>;
          return ((values[0] as num).toDouble(), (values[1] as num).toDouble());
        })
        .toList();

    return DrivingRoute(
      coordinates: coordinates,
      distanceKm: (route['distance'] as num).toDouble() / 1000,
      durationMin: (route['duration'] as num).toDouble() / 60,
    );
  } catch (_) {
    return null; // never let a routing failure break the map itself
  }
});
