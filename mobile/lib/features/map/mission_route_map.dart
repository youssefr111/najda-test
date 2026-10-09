import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../core/l10n/l10n_x.dart';
import '../../core/routing/route_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_palette.dart';
import 'map_gestures.dart';
import 'najda_map_style.dart';

enum _RouteMode { driving, straight }

/// Unit (or its home station) -> incident, with an OSRM driving route or a
/// straight line. Falls back to the station when the unit has no live position.
class MissionRouteMap extends ConsumerStatefulWidget {
  const MissionRouteMap({
    required this.destinationLatitude,
    required this.destinationLongitude,
    super.key,
    this.unitLatitude,
    this.unitLongitude,
    this.facilityLatitude,
    this.facilityLongitude,
  });

  final double? unitLatitude;
  final double? unitLongitude;
  final double? facilityLatitude;
  final double? facilityLongitude;
  final double destinationLatitude;
  final double destinationLongitude;

  @override
  ConsumerState<MissionRouteMap> createState() => _MissionRouteMapState();
}

class _MissionRouteMapState extends ConsumerState<MissionRouteMap> {
  MapLibreMapController? _controller;
  bool _styleLoaded = false;
  _RouteMode _mode = _RouteMode.driving;

  bool _drawing = false;
  bool _redrawQueued = false;
  bool _framed = false;

  double? get _fromLat => widget.unitLatitude ?? widget.facilityLatitude;
  double? get _fromLng => widget.unitLongitude ?? widget.facilityLongitude;
  bool get _hasOrigin => _fromLat != null && _fromLng != null;
  bool get _usingStation => _hasOrigin && widget.unitLatitude == null;

  RouteQuery? get _query => _hasOrigin
      ? (
          fromLng: _fromLng!,
          fromLat: _fromLat!,
          toLng: widget.destinationLongitude,
          toLat: widget.destinationLatitude,
        )
      : null;

  @override
  void didUpdateWidget(MissionRouteMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    unawaited(_redraw());
  }

  /// Serialised: map annotation calls are async, and overlapping redraws
  /// would leave duplicate markers behind.
  Future<void> _redraw({DrivingRoute? route}) async {
    if (_drawing) {
      _redrawQueued = true;
      return;
    }
    final controller = _controller;
    if (controller == null || !_styleLoaded) return;

    _drawing = true;
    try {
      await controller.clearCircles();
      await controller.clearLines();

      final destination = LatLng(widget.destinationLatitude, widget.destinationLongitude);
      final origin = _hasOrigin ? LatLng(_fromLat!, _fromLng!) : null;

      if (origin != null) {
        final points = _mode == _RouteMode.driving && route != null
            ? [for (final (lng, lat) in route.coordinates) LatLng(lat, lng)]
            : [origin, destination];
        await controller.addLine(
          LineOptions(
            geometry: points,
            lineColor: MapColors.route,
            lineWidth: _mode == _RouteMode.driving ? 4 : 3,
            lineOpacity: _mode == _RouteMode.driving ? 0.9 : 0.6,
          ),
        );
        await controller.addCircle(
          CircleOptions(
            geometry: origin,
            circleRadius: 9,
            circleColor: _usingStation ? MapColors.station : MapColors.unit,
            circleStrokeColor: '#ffffff',
            circleStrokeWidth: 3,
          ),
        );
      }
      await controller.addCircle(
        CircleOptions(
          geometry: destination,
          circleRadius: 22,
          circleColor: MapColors.destination,
          circleOpacity: 0.22,
        ),
      );
      await controller.addCircle(
        CircleOptions(
          geometry: destination,
          circleRadius: 10,
          circleColor: MapColors.destination,
          circleStrokeColor: '#ffffff',
          circleStrokeWidth: 3,
        ),
      );

      if (!_framed) {
        _framed = true;
        await _frame(origin, destination);
      }
    } finally {
      _drawing = false;
      if (_redrawQueued) {
        _redrawQueued = false;
        unawaited(_redraw(route: route));
      }
    }
  }

  Future<void> _frame(LatLng? origin, LatLng destination) async {
    final controller = _controller;
    if (controller == null) return;
    if (origin == null) {
      await controller.animateCamera(CameraUpdate.newLatLngZoom(destination, 14));
      return;
    }
    final south = origin.latitude < destination.latitude ? origin.latitude : destination.latitude;
    final north = origin.latitude > destination.latitude ? origin.latitude : destination.latitude;
    final west = origin.longitude < destination.longitude ? origin.longitude : destination.longitude;
    final east = origin.longitude > destination.longitude ? origin.longitude : destination.longitude;
    await controller.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(southwest: LatLng(south, west), northeast: LatLng(north, east)),
        left: 48,
        top: 48,
        right: 48,
        bottom: 48,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    final query = _query;
    final route = _mode == _RouteMode.driving && query != null
        ? ref.watch(drivingRouteProvider(query)).valueOrNull
        : null;

    // Repaint whenever the route resolves.
    if (query != null) {
      ref.listen(
        drivingRouteProvider(query),
        (_, next) => unawaited(_redraw(route: next.valueOrNull)),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_hasOrigin)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                _ModeChip(
                  label: l10n.responderMissionMapDriving,
                  selected: _mode == _RouteMode.driving,
                  onTap: () => _setMode(_RouteMode.driving, route),
                ),
                const SizedBox(width: 8),
                _ModeChip(
                  label: l10n.responderMissionMapStraight,
                  selected: _mode == _RouteMode.straight,
                  onTap: () => _setMode(_RouteMode.straight, route),
                ),
                if (route != null && _mode == _RouteMode.driving) ...[
                  const Spacer(),
                  Text(
                    '${route.distanceKm.toStringAsFixed(1)} km · ${route.durationMin.round()} min',
                    style: TextStyle(fontSize: 12, color: p.textMuted),
                  ),
                ],
              ],
            ),
          ),
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            height: 260,
            child: MapLibreMap(
              styleString: najdaMapStyle,
              initialCameraPosition: CameraPosition(
                target: LatLng(widget.destinationLatitude, widget.destinationLongitude),
                zoom: 13,
              ),
              gestureRecognizers: mapGestureRecognizers,
              compassEnabled: false,
              rotateGesturesEnabled: false,
              tiltGesturesEnabled: false,
              onMapCreated: (controller) => _controller = controller,
              onStyleLoadedCallback: () {
                _styleLoaded = true;
                unawaited(_redraw(route: route));
              },
            ),
          ),
        ),
        const SizedBox(height: 6),
        if (!_hasOrigin)
          Text(l10n.responderMissionMapNoUnitLocation, style: TextStyle(fontSize: 12, color: p.textMuted))
        else if (_usingStation)
          Text(l10n.responderMissionMapFromStation, style: TextStyle(fontSize: 12, color: p.textMuted)),
      ],
    );
  }

  void _setMode(_RouteMode mode, DrivingRoute? route) {
    if (mode == _mode) return;
    setState(() => _mode = mode);
    unawaited(_redraw(route: route));
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.blue600 : p.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: selected ? AppColors.blue600 : p.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : p.text,
          ),
        ),
      ),
    );
  }
}
