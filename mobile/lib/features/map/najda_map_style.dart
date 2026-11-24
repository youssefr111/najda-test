import 'package:maplibre_gl/maplibre_gl.dart';

/// Same free style and tile source as the web app (OpenFreeMap "liberty").
const najdaMapStyle = 'https://tiles.openfreemap.org/styles/liberty';

/// Cairo -- the web app's default pin location.
const defaultMapCenterLat = 30.0444;
const defaultMapCenterLng = 31.2357;

/// Hard zoom limits for every map. Without them a degenerate camera fit (all points identical, or one of
/// them at 0,0) can send the camera to an extreme zoom and make MapLibre request and parse tiles endlessly.
const najdaMapZoomLimits = MinMaxZoomPreference(3, 18);

abstract final class MapColors {
  static const destination = '#db313f';
  static const unit = '#2563eb';
  static const station = '#0d9488';
  static const route = '#2563eb';
}