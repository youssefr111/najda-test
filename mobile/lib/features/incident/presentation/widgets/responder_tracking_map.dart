import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/layout/responsive.dart';
import '../../../../core/map/map_markers.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../map/map_gestures.dart';
import '../../../map/najda_map_style.dart';
import '../../../responder/domain/unit.dart';
import '../../application/incident_providers.dart';
import '../../domain/incident.dart';
import '../../domain/incident_responder.dart';

/// Citizen view of who is coming: the incident pin plus the responding units'
/// live positions. Only data from the citizen-safe `/responders` endpoint is
/// used, never the full unit or mission feeds. (The unit list itself is shown
/// by the screen, not here.)
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
  MapLibreMapController? _controller;
  MarkerRegistry? _markers;
  bool _styleLoaded = false;
  bool _drawing = false;
  bool _redrawQueued = false;
  List<IncidentResponder> _responders = const [];
  int _framedCount = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _markers ??= MarkerRegistry(pixelRatio: MediaQuery.devicePixelRatioOf(context));
  }

  LatLng get _incidentPoint => LatLng(widget.incident.latitude, widget.incident.longitude);

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

      // Units first; the incident pin is drawn last so it is never hidden under one.
      for (final responder in _responders.where((r) => r.hasPosition)) {
        final image = await markers.ensure(
          controller,
          MarkerSpec(
            color: MarkerPalette.forUnitType(responder.unitType),
            icon: unitTypeIcon(responder.unitType),
            size: 30,
          ),
        );
        await controller.addSymbol(
          markerSymbol(LatLng(responder.latitude!, responder.longitude!), image, zIndex: 1),
        );
      }
      final incident = await markers.ensure(
        controller,
        const MarkerSpec(color: MarkerPalette.incident, icon: Icons.location_on, size: 38),
      );
      await controller.addSymbol(markerSymbol(_incidentPoint, incident, zIndex: 2));
      await _frameAll(controller);
    } finally {
      _drawing = false;
      if (_redrawQueued) {
        _redrawQueued = false;
        unawaited(_redraw());
      }
    }
  }

  /// Fits the incident and every located unit in view -- but only when a new
  /// unit appears, so it never fights the citizen's own panning and zooming.
  Future<void> _frameAll(MapLibreMapController controller) async {
    final located = _responders.where((r) => r.hasPosition).toList();
    if (located.length == _framedCount) return;
    _framedCount = located.length;
    if (located.isEmpty) return;

    final points = [_incidentPoint, for (final r in located) LatLng(r.latitude!, r.longitude!)];
    final south = points.map((p) => p.latitude).reduce((a, b) => a < b ? a : b);
    final north = points.map((p) => p.latitude).reduce((a, b) => a > b ? a : b);
    final west = points.map((p) => p.longitude).reduce((a, b) => a < b ? a : b);
    final east = points.map((p) => p.longitude).reduce((a, b) => a > b ? a : b);

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
            MapLibreMap(
              styleString: najdaMapStyle,
              initialCameraPosition: CameraPosition(target: _incidentPoint, zoom: 14.5),
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
