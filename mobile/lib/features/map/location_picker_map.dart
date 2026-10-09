import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../core/l10n/l10n_x.dart';
import '../../core/location/location_service.dart';
import '../../core/theme/app_palette.dart';
import '../incident/domain/incident.dart';
import 'map_gestures.dart';
import 'najda_map_style.dart';

class PickedLocation {
  const PickedLocation({required this.latitude, required this.longitude, required this.source});

  final double latitude;
  final double longitude;
  final LocationSource source;
}

/// Tap-to-drop emergency pin with "use my location", reset and zoom controls.
/// The camera only moves on an explicit locate-me / reset, so panning and
/// zooming freely never gets yanked back.
class LocationPickerMap extends ConsumerStatefulWidget {
  const LocationPickerMap({required this.value, required this.onChanged, super.key});

  final PickedLocation? value;
  final ValueChanged<PickedLocation?> onChanged;

  @override
  ConsumerState<LocationPickerMap> createState() => _LocationPickerMapState();
}

class _LocationPickerMapState extends ConsumerState<LocationPickerMap> {
  MapLibreMapController? _controller;
  bool _styleLoaded = false;
  Circle? _halo;
  Circle? _pin;
  bool _locating = false;
  String? _error;

  double get _lat => widget.value?.latitude ?? defaultMapCenterLat;
  double get _lng => widget.value?.longitude ?? defaultMapCenterLng;

  @override
  void didUpdateWidget(LocationPickerMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    final a = oldWidget.value;
    final b = widget.value;
    if (a?.latitude != b?.latitude || a?.longitude != b?.longitude) unawaited(_drawPin());
  }

  Future<void> _drawPin() async {
    final controller = _controller;
    if (controller == null || !_styleLoaded) return;

    final geometry = LatLng(_lat, _lng);
    if (_pin != null && _halo != null) {
      await controller.updateCircle(_halo!, CircleOptions(geometry: geometry));
      await controller.updateCircle(_pin!, CircleOptions(geometry: geometry));
      return;
    }
    _halo = await controller.addCircle(
      CircleOptions(
        geometry: geometry,
        circleRadius: 22,
        circleColor: MapColors.destination,
        circleOpacity: 0.22,
      ),
    );
    _pin = await controller.addCircle(
      CircleOptions(
        geometry: geometry,
        circleRadius: 9,
        circleColor: MapColors.destination,
        circleStrokeColor: '#ffffff',
        circleStrokeWidth: 3,
      ),
    );
  }

  Future<void> _flyTo(double lat, double lng, double zoom) async {
    await _controller?.animateCamera(CameraUpdate.newLatLngZoom(LatLng(lat, lng), zoom));
  }

  Future<void> _locateMe() async {
    final l10n = context.l10n;
    setState(() {
      _locating = true;
      _error = null;
    });

    final outcome = await ref.read(locationServiceProvider).currentPosition();
    if (!mounted) return;

    switch (outcome) {
      case LocationFound(:final position):
        widget.onChanged(
          PickedLocation(
            latitude: position.latitude,
            longitude: position.longitude,
            source: LocationSource.gps,
          ),
        );
        await _flyTo(position.latitude, position.longitude, 17);
      case LocationDenied():
        _error = l10n.citizenReportLocationDenied;
      case LocationFailed():
        _error = l10n.commonError;
    }
    if (mounted) setState(() => _locating = false);
  }

  Future<void> _reset() async {
    widget.onChanged(null);
    await _flyTo(defaultMapCenterLat, defaultMapCenterLng, 15);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 288,
        child: Stack(
          children: [
            MapLibreMap(
              styleString: najdaMapStyle,
              initialCameraPosition: const CameraPosition(
                target: LatLng(defaultMapCenterLat, defaultMapCenterLng),
                zoom: 12,
              ),
              gestureRecognizers: mapGestureRecognizers,
              compassEnabled: false,
              rotateGesturesEnabled: false,
              tiltGesturesEnabled: false,
              onMapCreated: (controller) => _controller = controller,
              onStyleLoadedCallback: () {
                _styleLoaded = true;
                unawaited(_drawPin());
              },
              onMapClick: (_, coordinates) => widget.onChanged(
                PickedLocation(
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                  source: LocationSource.manualPin,
                ),
              ),
            ),

            // Coordinates overlay
            PositionedDirectional(
              start: 12,
              bottom: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: p.surface.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircleAvatar(
                      radius: 14,
                      backgroundColor: Color(0xFFDB313F),
                      child: Icon(Icons.location_on, size: 16, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.value != null
                              ? l10n.citizenReportLocationCaptured
                              : l10n.citizenReportLocation,
                          style: TextStyle(fontSize: 11, color: p.textMuted),
                        ),
                        Text(
                          '${_lat.toStringAsFixed(4)}°, ${_lng.toStringAsFixed(4)}°',
                          textDirection: TextDirection.ltr,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: p.text),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Controls
            PositionedDirectional(
              end: 12,
              top: 12,
              child: Column(
                children: [
                  _MapButton(
                    onPressed: _locating ? null : _locateMe,
                    child: _locating
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFDB313F)),
                          )
                        : Icon(Icons.my_location, size: 20, color: p.text),
                  ),
                  const SizedBox(height: 8),
                  _MapButton(onPressed: _reset, child: Icon(Icons.refresh, size: 20, color: p.text)),
                  const SizedBox(height: 8),
                  _MapButton(
                    onPressed: () => _controller?.animateCamera(CameraUpdate.zoomIn()),
                    child: Icon(Icons.add, size: 20, color: p.text),
                  ),
                  const SizedBox(height: 8),
                  _MapButton(
                    onPressed: () => _controller?.animateCamera(CameraUpdate.zoomOut()),
                    child: Icon(Icons.remove, size: 20, color: p.text),
                  ),
                ],
              ),
            ),

            if (_error != null)
              PositionedDirectional(
                start: 12,
                end: 64,
                top: 12,
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: p.surface.withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(_error!, style: TextStyle(fontSize: 12, color: p.danger)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MapButton extends StatelessWidget {
  const _MapButton({required this.child, required this.onPressed});

  final Widget child;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: p.surface.withValues(alpha: 0.95),
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: SizedBox(height: 40, width: 40, child: Center(child: child)),
      ),
    );
  }
}
