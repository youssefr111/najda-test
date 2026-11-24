import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/layout/responsive.dart';
import '../../../../core/map/map_markers.dart';
import '../../../../core/routing/route_service.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../map/map_gestures.dart';
import '../../../map/najda_map_style.dart';
import '../../../responder/domain/mission.dart';
import '../../../responder/domain/unit.dart';
import '../../application/incident_providers.dart';
import '../../domain/incident.dart';
import '../../domain/incident_responder.dart';

/// Citizen view of who is coming: the incident pin, the responding units' live positions and the driving
/// route each unit still has to take to reach the incident. Only data from the citizen-safe `/responders`
/// endpoint is used, never the full unit or mission feeds. (The unit list itself is shown by the screen.)
/// Marker colour (hex) per unit type: shared by the map and the unit list.
abstract final class ResponderTrackingMapColors {
  /// Hex colour of a unit type -- distinct from the incident's red so a unit is never mistaken for it.
  static String of(UnitType type) => MarkerPalette.toHex(MarkerPalette.forUnitType(type));
}

class ResponderTrackingMap extends ConsumerStatefulWidget {
  const ResponderTrackingMap({required this.incident, super.key});

  final Incident incident;

  @override
  ConsumerState<ResponderTrackingMap> createState() => _ResponderTrackingMapState();
}

class _ResponderTrackingMapState extends ConsumerState<ResponderTrackingMap> {
  /// Statuses in which a unit is still driving towards the incident (on scene or finished: nothing to route).
  static const _travelling = {MissionStatus.accepted, MissionStatus.enRoute};

  MapLibreMapController? _controller;
  MarkerRegistry? _markers;
  bool _styleLoaded = false;
  bool _disposed = false;
  bool _drawing = false;
  bool _redrawQueued = false;
  List<IncidentResponder> _responders = const [];
  int _framedCount = 0;

  /// Routes by coordinates rounded to ~100 m, so a unit creeping along the road reuses its route instead of
  /// asking the public routers again on every position update. `null` = no route found (a straight line is drawn).
  final Map<RouteQuery, DrivingRoute?> _routes = {};

  LatLng get _incidentPoint => LatLng(widget.incident.latitude, widget.incident.longitude);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _markers ??= MarkerRegistry(pixelRatio: MediaQuery.devicePixelRatioOf(context));
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  RouteQuery _queryFor(IncidentResponder responder) => (
        fromLng: roundCoordinate(responder.longitude!),
        fromLat: roundCoordinate(responder.latitude!),
        toLng: widget.incident.longitude,
        toLat: widget.incident.latitude,
      );

  Future<DrivingRoute?> _routeFor(RouteQuery query) async {
    if (_routes.containsKey(query)) return _routes[query];
    if (_routes.length > 40) _routes.clear();
    try {
      return _routes[query] = await ref.read(drivingRouteProvider(query).future);
    } catch (_) {
      return _routes[query] = null;
    }
  }

  /// The line from [responder] to the incident: the real driving route, or a straight hint when none is available.
  Future<LineOptions> _lineFor(IncidentResponder responder) async {
    final route = await _routeFor(_queryFor(responder));
    final from = LatLng(responder.latitude!, responder.longitude!);
    return LineOptions(
      geometry: route == null
          ? [from, _incidentPoint]
          : [from, for (final (lng, lat) in route.sampled()) LatLng(lat, lng)],
      lineColor: ResponderTrackingMapColors.of(responder.unitType),
      lineWidth: route == null ? 3 : 5,
      lineOpacity: route == null ? 0.5 : 0.85,
    );
  }

  /// Serialised: map calls are async, and overlapping redraws would leave duplicates behind.
  Future<void> _redraw() async {
    if (_drawing) {
      _redrawQueued = true;
      return;
    }
    final controller = _controller;
    final markers = _markers;
    if (_disposed || controller == null || markers == null || !_styleLoaded) return;

    _drawing = true;
    try {
      final located = _responders.where((r) => r.hasPosition).toList();

      // Routes for every unit that is still on its way (police positions are withheld by the server).
      final lines = await Future.wait([
        for (final r in located.where((r) => _travelling.contains(r.status))) _lineFor(r),
      ]);

      // Units first; the incident pin is drawn last so it is never hidden under one.
      final symbols = <SymbolOptions>[];
      for (final responder in located) {
        final image = await markers.ensure(
          controller,
          MarkerSpec(
            color: MarkerPalette.forUnitType(responder.unitType),
            icon: unitTypeIcon(responder.unitType),
            size: 30,
          ),
        );
        symbols.add(markerSymbol(LatLng(responder.latitude!, responder.longitude!), image, zIndex: 1));
      }
      final incident = await markers.ensure(
        controller,
        const MarkerSpec(color: MarkerPalette.incident, icon: Icons.location_on, size: 38),
      );
      symbols.add(markerSymbol(_incidentPoint, incident, zIndex: 2));

      if (_disposed) return;
      await controller.clearLines();
      await controller.clearSymbols();
      if (_disposed) return;
      if (lines.isNotEmpty) await controller.addLines(lines);
      await controller.addSymbols(symbols);
      await _frameAll(controller, located);
    } finally {
      _drawing = false;
      if (_redrawQueued && !_disposed) {
        _redrawQueued = false;
        unawaited(_redraw());
      }
    }
  }

  /// Fits the incident and every located unit in view -- but only when a new
  /// unit appears, so it never fights the citizen's own panning and zooming.
  Future<void> _frameAll(MapLibreMapController controller, List<IncidentResponder> located) async {
    if (located.length == _framedCount) return;
    _framedCount = located.length;
    if (located.isEmpty) return;

    final points = [_incidentPoint, for (final r in located) LatLng(r.latitude!, r.longitude!)];
    final south = points.map((p) => p.latitude).reduce((a, b) => a < b ? a : b);
    final north = points.map((p) => p.latitude).reduce((a, b) => a > b ? a : b);
    final west = points.map((p) => p.longitude).reduce((a, b) => a < b ? a : b);
    final east = points.map((p) => p.longitude).reduce((a, b) => a > b ? a : b);

    // Everything on the same spot: a bounds fit would zoom to infinity.
    if ((north - south) < 1e-5 && (east - west) < 1e-5) {
      await controller.animateCamera(CameraUpdate.newLatLngZoom(_incidentPoint, 15));
      return;
    }

    await controller.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(southwest: LatLng(south, west), northeast: LatLng(north, east)),
        left: 56,
        top: 56,
        right: 56,
        bottom: 56,
      ),
    );
  }

  Future<void> _recenter() async {
    _framedCount = -1; // forces the next frame to re-fit
    final controller = _controller;
    if (controller == null) return;
    if (_responders.any((r) => r.hasPosition)) {
      await _redraw();
    } else {
      await controller.animateCamera(CameraUpdate.newLatLngZoom(_incidentPoint, 15));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    ref.listen(incidentRespondersProvider(widget.incident.id), (_, next) {
      _responders = next.value ?? _responders;
      unawaited(_redraw());
    });
    _responders = ref.watch(incidentRespondersProvider(widget.incident.id)).value ?? _responders;

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: SizedBox(
        height: context.adaptive<double>(compact: 200, regular: 240, tablet: 320),
        child: Stack(
          children: [
            RepaintBoundary(
              child: MapLibreMap(
                styleString: najdaMapStyle,
                initialCameraPosition: CameraPosition(target: _incidentPoint, zoom: 14.5),
                minMaxZoomPreference: najdaMapZoomLimits,
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
            ),
            PositionedDirectional(
              end: 10,
              top: 10,
              child: Material(
                color: p.surface.withValues(alpha: 0.95),
                shape: const CircleBorder(),
                elevation: 2,
                child: IconButton(
                  tooltip: l10n.responderTrackingRecenter,
                  onPressed: _recenter,
                  icon: Icon(Icons.my_location, size: 20, color: p.text),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}