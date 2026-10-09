import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../../../core/l10n/enum_labels.dart';
import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../map/map_gestures.dart';
import '../../../map/najda_map_style.dart';
import '../../../responder/domain/unit.dart';
import '../../application/incident_providers.dart';
import '../../domain/incident.dart';
import '../../domain/incident_responder.dart';

/// Citizen view of who is coming: the incident pin plus the responding units'
/// live positions. Only data from the citizen-safe `/responders` endpoint is
/// used, never the full unit or mission feeds.
class ResponderTrackingMap extends ConsumerStatefulWidget {
  const ResponderTrackingMap({required this.incident, super.key});

  final Incident incident;

  @override
  ConsumerState<ResponderTrackingMap> createState() => _ResponderTrackingMapState();
}

class _ResponderTrackingMapState extends ConsumerState<ResponderTrackingMap> {
  MapLibreMapController? _controller;
  bool _styleLoaded = false;
  bool _drawing = false;
  bool _redrawQueued = false;
  List<IncidentResponder> _responders = const [];

  static const _unitColors = {
    UnitType.ambulance: '#dc2626',
    UnitType.fireTruck: '#ea580c',
    UnitType.policeCar: '#2563eb',
    UnitType.firstResponder: '#7c3aed',
  };

  Future<void> _redraw() async {
    if (_drawing) {
      _redrawQueued = true;
      return;
    }
    final controller = _controller;
    if (controller == null || !_styleLoaded) return;

    _drawing = true;
    try {
      await controller.clearCircles();
      final incident = LatLng(widget.incident.latitude, widget.incident.longitude);
      await controller.addCircle(
        CircleOptions(
          geometry: incident,
          circleRadius: 22,
          circleColor: MapColors.destination,
          circleOpacity: 0.22,
        ),
      );
      await controller.addCircle(
        CircleOptions(
          geometry: incident,
          circleRadius: 10,
          circleColor: MapColors.destination,
          circleStrokeColor: '#ffffff',
          circleStrokeWidth: 3,
        ),
      );
      for (final responder in _responders.where((r) => r.hasPosition)) {
        await controller.addCircle(
          CircleOptions(
            geometry: LatLng(responder.latitude!, responder.longitude!),
            circleRadius: 9,
            circleColor: _unitColors[responder.unitType],
            circleStrokeColor: '#ffffff',
            circleStrokeWidth: 3,
          ),
        );
      }
    } finally {
      _drawing = false;
      if (_redrawQueued) {
        _redrawQueued = false;
        unawaited(_redraw());
      }
    }
  }

  Future<void> _recenter() => _controller?.animateCamera(
        CameraUpdate.newLatLngZoom(LatLng(widget.incident.latitude, widget.incident.longitude), 14),
      ) ??
      Future<void>.value();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    ref.listen(incidentRespondersProvider(widget.incident.id), (_, next) {
      _responders = next.valueOrNull ?? _responders;
      unawaited(_redraw());
    });
    _responders = ref.watch(incidentRespondersProvider(widget.incident.id)).valueOrNull ?? _responders;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            height: 240,
            child: Stack(
              children: [
                MapLibreMap(
                  styleString: najdaMapStyle,
                  initialCameraPosition: CameraPosition(
                    target: LatLng(widget.incident.latitude, widget.incident.longitude),
                    zoom: 14,
                  ),
                  gestureRecognizers: mapGestureRecognizers,
                  compassEnabled: false,
                  rotateGesturesEnabled: false,
                  tiltGesturesEnabled: false,
                  onMapCreated: (controller) => _controller = controller,
                  onStyleLoadedCallback: () {
                    _styleLoaded = true;
                    unawaited(_redraw());
                  },
                ),
                PositionedDirectional(
                  end: 8,
                  top: 8,
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
        ),
        for (final responder in _responders)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              children: [
                Container(
                  height: 10,
                  width: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(int.parse('FF${_unitColors[responder.unitType]!.substring(1)}', radix: 16)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${unitTypeLabel(l10n, responder.unitType)} · ${responderProgressLabel(l10n, responder.status)}'
                    '${responder.hasPosition ? '' : ' (${l10n.responderTrackingLocationUnavailable})'}',
                    style: TextStyle(fontSize: 13, color: p.text),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
