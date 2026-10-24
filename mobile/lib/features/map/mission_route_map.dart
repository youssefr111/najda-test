import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../core/l10n/enum_labels.dart';
import '../../core/l10n/l10n_x.dart';
import '../../core/map/map_markers.dart';
import '../../core/routing/route_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_palette.dart';
import '../responder/domain/teammate_unit.dart';
import '../responder/domain/unit.dart';
import 'map_gestures.dart';
import 'najda_map_style.dart';

enum _RouteMode { driving, straight }

/// Unit (or its home station) -> destination, with a real driving route or a straight line, plus the
/// other units working the same incident. Markers carry icons and distinct colours like the web's:
/// incident = red pin, your unit = blue (its type's icon), your station = teal, teammates = their
/// route colour. The destination is the incident, or -- once an ambulance has chosen one -- the
/// hospital (purple building).
class MissionRouteMap extends ConsumerStatefulWidget {
  const MissionRouteMap({
    required this.destinationLatitude,
    required this.destinationLongitude,
    super.key,
    this.unitType,
    this.unitLatitude,
    this.unitLongitude,
    this.facilityLatitude,
    this.facilityLongitude,
    this.teammates = const [],
    this.incidentLatitude,
    this.incidentLongitude,
  });

  final UnitType? unitType;
  final double? unitLatitude;
  final double? unitLongitude;
  final double? facilityLatitude;
  final double? facilityLongitude;

  /// Where the route ends.
  final double destinationLatitude;
  final double destinationLongitude;

  /// Set only when the destination is a hospital: the incident is then drawn too, as a reference.
  final double? incidentLatitude;
  final double? incidentLongitude;
  final List<TeammateUnit> teammates;

  bool get _toHospital => incidentLatitude != null && incidentLongitude != null;

  @override
  ConsumerState<MissionRouteMap> createState() => _MissionRouteMapState();
}

class _MissionRouteMapState extends ConsumerState<MissionRouteMap> {
  MapLibreMapController? _controller;
  MarkerRegistry? _markers;
  bool _styleLoaded = false;
  _RouteMode _mode = _RouteMode.driving;
  bool _showTeammates = true;

  bool _drawing = false;
  bool _redrawQueued = false;
  bool _framed = false;

  /// Latest own driving route (set from build) and a small cache for teammates, keyed by
  /// coordinates rounded to ~100 m so live movement does not hammer the routers.
  DrivingRoute? _ownRoute;
  final Map<RouteQuery, DrivingRoute?> _teammateRoutes = {};

  double? get _fromLat => widget.unitLatitude ?? widget.facilityLatitude;
  double? get _fromLng => widget.unitLongitude ?? widget.facilityLongitude;
  bool get _hasOrigin => _fromLat != null && _fromLng != null;
  bool get _usingStation => _hasOrigin && widget.unitLatitude == null;
  LatLng get _destination => LatLng(widget.destinationLatitude, widget.destinationLongitude);

  RouteQuery? get _query => _hasOrigin
      ? (fromLng: _fromLng!, fromLat: _fromLat!, toLng: widget.destinationLongitude, toLat: widget.destinationLatitude)
      : null;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _markers ??= MarkerRegistry(pixelRatio: MediaQuery.devicePixelRatioOf(context));
  }

  @override
  void didUpdateWidget(MissionRouteMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.destinationLatitude != widget.destinationLatitude ||
        oldWidget.destinationLongitude != widget.destinationLongitude) {
      _framed = false; // a new destination (incident -> hospital): frame it again
    }
    unawaited(_redraw());
  }

  double _round(double v) => (v * 1000).round() / 1000;

  Future<List<LatLng>> _teammatePoints(TeammateUnit mate) async {
    final origin = LatLng(mate.latitude, mate.longitude);
    if (_mode != _RouteMode.driving) return [origin, _destination];

    final query = (
      fromLng: _round(mate.longitude),
      fromLat: _round(mate.latitude),
      toLng: widget.destinationLongitude,
      toLat: widget.destinationLatitude,
    );
    if (!_teammateRoutes.containsKey(query)) {
      try {
        _teammateRoutes[query] = await ref.read(drivingRouteProvider(query).future);
      } catch (_) {
        _teammateRoutes[query] = null;
      }
    }
    final route = _teammateRoutes[query];
    return route == null ? [origin, _destination] : [for (final (lng, lat) in route.coordinates) LatLng(lat, lng)];
  }

  /// Serialised: map calls are async, and overlapping redraws would leave duplicate markers behind.
  Future<void> _redraw() async {
    if (_drawing) {
      _redrawQueued = true;
      return;
    }
    final controller = _controller;
    final markers = _markers;
    if (controller == null || markers == null || !_styleLoaded) return;

    _drawing = true;
    try {
      await controller.clearSymbols();
      await controller.clearLines();

      final origin = _hasOrigin ? LatLng(_fromLat!, _fromLng!) : null;

      // Routes first, so every marker sits above them.
      if (_showTeammates) {
        for (final mate in widget.teammates.where((m) => m.isRoutable)) {
          await controller.addLine(
            LineOptions(geometry: await _teammatePoints(mate), lineColor: mate.color, lineWidth: 3, lineOpacity: 0.75),
          );
        }
      }
      if (origin != null) {
        final route = _ownRoute;
        final real = _mode == _RouteMode.driving && route != null;
        await controller.addLine(
          LineOptions(
            geometry: real ? [for (final (lng, lat) in route.coordinates) LatLng(lat, lng)] : [origin, _destination],
            lineColor: widget._toHospital ? MarkerPalette.toHex(MarkerPalette.hospitalOwn) : MapColors.route,
            lineWidth: real ? 5 : 3,
            // A straight line is only a hint of direction, so it is drawn lighter than a real route.
            lineOpacity: real ? 0.9 : 0.5,
          ),
        );
      }

      if (_showTeammates) {
        for (final mate in widget.teammates) {
          final image = await markers.ensure(
            controller,
            MarkerSpec(color: MarkerPalette.fromHex(mate.color), icon: unitTypeIcon(mate.unitType), size: 28),
          );
          await controller.addSymbol(markerSymbol(LatLng(mate.latitude, mate.longitude), image, zIndex: 1));
        }
      }

      if (origin != null) {
        final image = await markers.ensure(
          controller,
          MarkerSpec(
            color: _usingStation ? MarkerPalette.station : MarkerPalette.ownUnit,
            icon: _usingStation ? Icons.home_work : unitTypeIcon(widget.unitType ?? UnitType.ambulance),
            size: 34,
          ),
        );
        await controller.addSymbol(markerSymbol(origin, image, zIndex: 2));
      }

      if (widget._toHospital) {
        // Heading to a hospital: it is the destination, the incident is just where the patient was.
        final hospital = await markers.ensure(
          controller,
          const MarkerSpec(color: MarkerPalette.hospitalOwn, icon: Icons.apartment, size: 38),
        );
        final incident = await markers.ensure(
          controller,
          const MarkerSpec(color: MarkerPalette.incident, icon: Icons.location_on, size: 26),
        );
        await controller.addSymbol(
          markerSymbol(LatLng(widget.incidentLatitude!, widget.incidentLongitude!), incident, zIndex: 2),
        );
        await controller.addSymbol(markerSymbol(_destination, hospital, zIndex: 3));
      } else {
        final incident = await markers.ensure(
          controller,
          const MarkerSpec(color: MarkerPalette.incident, icon: Icons.location_on, size: 38),
        );
        await controller.addSymbol(markerSymbol(_destination, incident, zIndex: 3));
      }

      if (!_framed) {
        _framed = true;
        await _frame(origin);
      }
    } finally {
      _drawing = false;
      if (_redrawQueued) {
        _redrawQueued = false;
        unawaited(_redraw());
      }
    }
  }

  Future<void> _frame(LatLng? origin) async {
    final controller = _controller;
    if (controller == null) return;
    final destination = _destination;
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

  /// The web's "re-center" button: back to the destination, whatever the map was panned to.
  Future<void> _recenter() => _controller?.animateCamera(CameraUpdate.newLatLngZoom(_destination, 14)) ?? Future.value();

  void _setMode(_RouteMode mode) {
    if (mode == _mode) return;
    setState(() => _mode = mode);
    unawaited(_redraw());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    final query = _query;
    final routeState = _mode == _RouteMode.driving && query != null ? ref.watch(drivingRouteProvider(query)) : null;
    _ownRoute = routeState?.value;
    final routeLoading = routeState != null && routeState.isLoading;
    final routeFailed = routeState != null && !routeState.isLoading && routeState.value == null;

    if (query != null) {
      ref.listen(drivingRouteProvider(query), (_, _) => unawaited(_redraw()));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_hasOrigin || widget.teammates.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (_hasOrigin) ...[
                  _ModeChip(
                    label: l10n.missionRouteMapDriving,
                    selected: _mode == _RouteMode.driving,
                    onTap: () => _setMode(_RouteMode.driving),
                  ),
                  _ModeChip(
                    label: l10n.missionRouteMapStraight,
                    selected: _mode == _RouteMode.straight,
                    onTap: () => _setMode(_RouteMode.straight),
                  ),
                ],
                if (widget.teammates.isNotEmpty)
                  _ModeChip(
                    label: l10n.missionRouteMapOtherUnits(widget.teammates.length),
                    selected: _showTeammates,
                    onTap: () {
                      setState(() => _showTeammates = !_showTeammates);
                      unawaited(_redraw());
                    },
                  ),
                if (routeLoading)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2)),
                      const SizedBox(width: 6),
                      Text(l10n.missionRouteMapCalculating, style: TextStyle(fontSize: 12, color: p.textMuted)),
                    ],
                  )
                else if (_ownRoute != null)
                  Text(
                    '${_ownRoute!.distanceKm.toStringAsFixed(1)} km · ${_ownRoute!.durationMin.round()} min',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: p.textMuted),
                  ),
              ],
            ),
          ),
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            height: 260,
            child: Stack(
              children: [
                MapLibreMap(
                  styleString: najdaMapStyle,
                  initialCameraPosition: CameraPosition(target: _destination, zoom: 13),
                  gestureRecognizers: mapGestureRecognizers,
                  compassEnabled: false,
                  rotateGesturesEnabled: false,
                  tiltGesturesEnabled: false,
                  onMapCreated: (controller) => _controller = controller,
                  onStyleLoadedCallback: () async {
                    _styleLoaded = true;
                    _markers?.reset();
                    await _controller?.setSymbolIconAllowOverlap(true);
                    await _controller?.setSymbolIconIgnorePlacement(true);
                    unawaited(_redraw());
                  },
                ),
                PositionedDirectional(
                  top: 8,
                  start: 8,
                  child: Material(
                    color: p.surface.withValues(alpha: 0.95),
                    shape: const CircleBorder(),
                    elevation: 2,
                    child: IconButton(
                      tooltip: widget._toHospital ? l10n.missionRouteMapRecenterHospital : l10n.missionRouteMapRecenter,
                      onPressed: _recenter,
                      icon: Icon(Icons.my_location, size: 20, color: p.text),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_showTeammates && widget.teammates.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 6,
            children: [
              for (final mate in widget.teammates)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      height: 10,
                      width: 10,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: MarkerPalette.fromHex(mate.color)),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${mate.label} · ${unitTypeLabel(l10n, mate.unitType)}',
                      style: TextStyle(fontSize: 12, color: p.textMuted),
                    ),
                  ],
                ),
            ],
          ),
        ],
        const SizedBox(height: 6),
        if (!_hasOrigin)
          Text(l10n.missionRouteMapNoUnitLocation, style: TextStyle(fontSize: 12, color: p.textMuted))
        else if (routeFailed)
          // Honest about the fallback: the line is a straight hint, not a route.
          Row(
            children: [
              Icon(Icons.info_outline, size: 14, color: p.warning),
              const SizedBox(width: 6),
              Expanded(
                child: Text(l10n.missionRouteMapUnavailable, style: TextStyle(fontSize: 12, color: p.textMuted)),
              ),
              TextButton(
                onPressed: () => ref.invalidate(drivingRouteProvider(query!)),
                child: Text(l10n.commonRetry),
              ),
            ],
          )
        else if (_usingStation)
          Text(l10n.missionRouteMapFromStation, style: TextStyle(fontSize: 12, color: p.textMuted)),
      ],
    );
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
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: selected ? Colors.white : p.text),
        ),
      ),
    );
  }
}
