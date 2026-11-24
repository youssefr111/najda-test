import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:maplibre_gl/maplibre_gl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/geo/boundary.dart';
import '../../../../core/geo/geo_utils.dart';
import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/layout/responsive.dart';
import '../../../../core/location/location_service.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../map/map_gestures.dart';
import '../../../map/najda_map_style.dart';
import '../../application/location_config_provider.dart';
import '../../domain/incident.dart';
import '../../domain/incident_location_config.dart';
import '../../domain/report_position.dart';

enum _Status {
  locating,
  ready,
  denied,
  blocked,
  serviceOff,
  failed,
  outsideEgypt,
}

/// The "where are you" part of the report form.
///
/// Mirrors the web's rules, which the backend enforces:
///  * the live GPS fix is required and is taken automatically on open;
///  * it must be inside Egypt (the outline comes from the server);
///  * the pin may only be moved when the server allows manual pins, and then
///    only within a set radius of the device -- drawn on the map;
///  * the device's own position is always reported alongside the pin.
class ReportLocationCard extends ConsumerStatefulWidget {
  const ReportLocationCard({required this.onChanged, super.key});

  /// `null` whenever there is no usable position.
  final ValueChanged<ReportPosition?> onChanged;

  @override
  ConsumerState<ReportLocationCard> createState() => _ReportLocationCardState();
}

class _ReportLocationCardState extends ConsumerState<ReportLocationCard> {
  // The pin and the radius ring are drawn as style layers with interaction
  // switched off. As annotations (Circle / Fill) they would swallow taps: a tap
  // on a fill fires the fill's own event and never reaches `onMapClick`, and the
  // ring covers exactly the area the citizen is allowed to tap.
  static const _pinSource = 'report-pin';
  static const _ringSource = 'report-radius';

  MapLibreMapController? _controller;
  bool _layersReady = false;

  _Status _status = _Status.locating;
  LatLngPair? _gps;
  LatLngPair? _pin;
  String? _pinMessage;

  bool _syncing = false;
  bool _resync = false;

  IncidentLocationConfig get _config =>
      ref.read(incidentLocationConfigProvider).value ??
      IncidentLocationConfig.unknown;

  @override
  void initState() {
    super.initState();
    // Nothing can be sent without a location, so ask for it straight away.
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_locate()));
  }

  void _setPosition(ReportPosition? position) => widget.onChanged(position);

  Future<void> _locate() async {
    setState(() {
      _status = _Status.locating;
      _pinMessage = null;
    });

    final outcome = await ref.read(locationServiceProvider).currentPosition();
    if (!mounted) return;

    switch (outcome) {
      case LocationFound(:final position):
        if (!_config.contains(position.latitude, position.longitude)) {
          _fail(_Status.outsideEgypt);
          return;
        }
        final fix = (
          latitude: position.latitude,
          longitude: position.longitude,
        );
        setState(() {
          _gps = fix;
          _pin = fix;
          _status = _Status.ready;
        });
        _setPosition(
          ReportPosition.gps(latitude: fix.latitude, longitude: fix.longitude),
        );
        await _syncMap();
        await _fly(fix, _config.allowManualPin ? 16 : 17);
      case LocationDenied():
        _fail(_Status.denied);
      case LocationPermissionPermanentlyDenied():
        _fail(_Status.blocked);
      case LocationServiceDisabled():
        _fail(_Status.serviceOff);
      case LocationFailed():
        _fail(_Status.failed);
    }
  }

  void _fail(_Status status) {
    setState(() {
      _status = status;
      _gps = null;
      _pin = null;
    });
    _setPosition(null);
    unawaited(_syncMap());
  }

  void _onMapTap(LatLng tapped) {
    final l10n = context.l10n;
    final config = _config;
    if (!config.allowManualPin) return;

    final gps = _gps;
    if (gps == null) {
      setState(() => _pinMessage = l10n.reportLocationPinNeedsGps);
      return;
    }
    if (!config.contains(tapped.latitude, tapped.longitude)) {
      setState(() => _pinMessage = l10n.reportLocationPinOutsideEgypt);
      return;
    }
    final distance = distanceMeters(
      tapped.latitude,
      tapped.longitude,
      gps.latitude,
      gps.longitude,
    );
    if (distance > config.manualPinMaxRadiusMeters) {
      setState(
        () => _pinMessage = l10n.reportLocationPinTooFar(
          config.manualPinMaxRadiusMeters,
        ),
      );
      return;
    }

    setState(() {
      _pinMessage = null;
      _pin = (latitude: tapped.latitude, longitude: tapped.longitude);
    });
    _setPosition(
      ReportPosition(
        latitude: tapped.latitude,
        longitude: tapped.longitude,
        source: LocationSource.manualPin,
        deviceLatitude: gps.latitude,
        deviceLongitude: gps.longitude,
      ),
    );
    unawaited(_syncMap());
  }

  void _resetPin() {
    final gps = _gps;
    if (gps == null) return;
    setState(() {
      _pinMessage = null;
      _pin = gps;
    });
    _setPosition(
      ReportPosition.gps(latitude: gps.latitude, longitude: gps.longitude),
    );
    unawaited(_syncMap());
    unawaited(_fly(gps, 16));
  }

  // ---------------------------------------------------------------------------
  // Map drawing (serialised: draws never overlap, the latest state always wins)
  // ---------------------------------------------------------------------------

  Future<void> _syncMap() async {
    if (_syncing) {
      _resync = true;
      return;
    }
    _syncing = true;
    try {
      do {
        _resync = false;
        await _drawPin();
        await _drawRing();
      } while (_resync);
    } finally {
      _syncing = false;
    }
  }

  /// Registers the sources and layers once the map style is ready (and again if
  /// the style is ever reloaded, which discards them).
  Future<void> _installLayers() async {
    final controller = _controller;
    if (controller == null) return;

    try {
      await controller.addGeoJsonSource(_ringSource, _emptyCollection);
      await controller.addGeoJsonSource(_pinSource, _emptyCollection);

      await controller.addFillLayer(
        _ringSource,
        'report-radius-fill',
        const FillLayerProperties(
          fillColor: MapColors.route,
          fillOpacity: 0.12,
          fillOutlineColor: MapColors.route,
        ),
        enableInteraction: false,
      );
      await controller.addCircleLayer(
        _pinSource,
        'report-pin-halo',
        const CircleLayerProperties(
          circleRadius: 22,
          circleColor: MapColors.destination,
          circleOpacity: 0.22,
        ),
        enableInteraction: false,
      );
      await controller.addCircleLayer(
        _pinSource,
        'report-pin-dot',
        const CircleLayerProperties(
          circleRadius: 9,
          circleColor: MapColors.destination,
          circleStrokeColor: '#ffffff',
          circleStrokeWidth: 3,
        ),
        enableInteraction: false,
      );
      _layersReady = true;
    } catch (_) {
      // Already installed (style callback fired twice): the sources exist.
      _layersReady = true;
    }
    await _syncMap();
  }

  static const Map<String, dynamic> _emptyCollection = {
    'type': 'FeatureCollection',
    'features': <Object>[],
  };

  static Map<String, dynamic> _collection(Map<String, dynamic>? geometry) =>
      geometry == null
      ? _emptyCollection
      : {
          'type': 'FeatureCollection',
          'features': [
            {
              'type': 'Feature',
              'properties': <String, dynamic>{},
              'geometry': geometry,
            },
          ],
        };

  Future<void> _drawPin() async {
    final controller = _controller;
    if (controller == null || !_layersReady) return;

    final pin = _pin;
    await controller.setGeoJsonSource(
      _pinSource,
      _collection(
        pin == null
            ? null
            : {
                'type': 'Point',
                'coordinates': [pin.longitude, pin.latitude],
              },
      ),
    );
  }

  /// The area a manual pin may be moved within, around the device's own position.
  Future<void> _drawRing() async {
    final controller = _controller;
    if (controller == null || !_layersReady) return;

    final gps = _gps;
    final config = _config;
    final show =
        gps != null &&
        config.allowManualPin &&
        config.manualPinMaxRadiusMeters > 0;

    await controller.setGeoJsonSource(
      _ringSource,
      _collection(
        show
            ? {
                'type': 'Polygon',
                'coordinates': [
                  [
                    for (final point in circleRing(
                      gps.latitude,
                      gps.longitude,
                      config.manualPinMaxRadiusMeters.toDouble(),
                    ))
                      [point.longitude, point.latitude],
                  ],
                ],
              }
            : null,
      ),
    );
  }

  Future<void> _fly(LatLngPair target, double zoom) async {
    await _controller?.animateCamera(
      CameraUpdate.newLatLngZoom(
        LatLng(target.latitude, target.longitude),
        zoom,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final config =
        ref.watch(incidentLocationConfigProvider).value ??
        IncidentLocationConfig.unknown;

    // The rules can arrive after the first fix; re-check it against them.
    ref.listen(incidentLocationConfigProvider, (_, next) {
      final rules = next.value;
      final gps = _gps;
      if (rules == null || gps == null) return;
      if (!rules.contains(gps.latitude, gps.longitude)) {
        _fail(_Status.outsideEgypt);
      } else {
        unawaited(_syncMap());
      }
    });

    final mapHeight = context.adaptive<double>(
      compact: 220,
      regular: 260,
      tablet: 340,
    );
    final pin = _pin;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: SizedBox(
            height: mapHeight,
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
                    _layersReady = false;
                    unawaited(_installLayers());
                  },
                  onMapClick: (_, coordinates) => _onMapTap(coordinates),
                ),
                if (pin != null)
                  PositionedDirectional(
                    start: 10,
                    bottom: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: p.surface.withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${pin.latitude.toStringAsFixed(4)}°, ${pin.longitude.toStringAsFixed(4)}°',
                        textDirection: TextDirection.ltr,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: p.text,
                        ),
                      ),
                    ),
                  ),
                PositionedDirectional(
                  end: 10,
                  top: 10,
                  child: Column(
                    children: [
                      _MapButton(
                        tooltip: l10n.reportLocationUseMyLocation,
                        onPressed: _status == _Status.locating ? null : _locate,
                        child: _status == _Status.locating
                            ? SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: p.primary,
                                ),
                              )
                            : Icon(Icons.my_location, size: 20, color: p.text),
                      ),
                      if (config.allowManualPin && _gps != null) ...[
                        const SizedBox(height: 8),
                        _MapButton(
                          tooltip: l10n.reportLocationResetPin,
                          onPressed: _resetPin,
                          child: Icon(
                            Icons.location_searching,
                            size: 20,
                            color: p.text,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        _StatusPanel(
          status: _status,
          config: config,
          pinMessage: _pinMessage,
          onRetry: _locate,
        ),
      ],
    );
  }
}

class _StatusPanel extends ConsumerWidget {
  const _StatusPanel({
    required this.status,
    required this.config,
    required this.pinMessage,
    required this.onRetry,
  });

  final _Status status;
  final IncidentLocationConfig config;
  final String? pinMessage;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final ready = status == _Status.ready;
    final locating = status == _Status.locating;
    final color = ready ? p.success : (locating ? p.textMuted : p.warning);

    final (title, detail) = switch (status) {
      _Status.locating => (
        l10n.reportLocationLocating,
        l10n.reportLocationShareHint,
      ),
      _Status.ready => (
        l10n.reportLocationReady,
        pinMessage ??
            (config.allowManualPin
                ? l10n.reportLocationPinHint(config.manualPinMaxRadiusMeters)
                : l10n.reportLocationGpsOnlyHint),
      ),
      _Status.denied => (
        l10n.reportLocationNeeded,
        l10n.reportLocationShareHint,
      ),
      _Status.blocked => (
        l10n.reportLocationNeeded,
        l10n.reportLocationBlocked,
      ),
      _Status.serviceOff => (
        l10n.reportLocationNeeded,
        l10n.reportLocationServiceOff,
      ),
      _Status.failed => (l10n.reportLocationNeeded, l10n.reportLocationFailed),
      _Status.outsideEgypt => (
        l10n.reportLocationNeeded,
        l10n.reportLocationOutsideEgypt,
      ),
    };

    final service = ref.read(locationServiceProvider);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                ready
                    ? Icons.gps_fixed
                    : (locating
                          ? Icons.gps_not_fixed
                          : Icons.location_off_outlined),
                color: color,
                size: 22,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      detail,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        color: p.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (!ready && !locating) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                if (status == _Status.blocked)
                  FilledButton.tonalIcon(
                    onPressed: service.openAppSettings,
                    icon: const Icon(Icons.settings_outlined, size: 18),
                    label: Text(l10n.openSettings),
                  )
                else if (status == _Status.serviceOff)
                  FilledButton.tonalIcon(
                    onPressed: service.openLocationSettings,
                    icon: const Icon(Icons.settings_outlined, size: 18),
                    label: Text(l10n.openSettings),
                  ),
                TextButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: Text(l10n.commonRetry),
                ),
              ],
            ),
            const Divider(height: 24),
            Text(
              l10n.reportLocationCallHotline,
              style: TextStyle(fontSize: 12, color: p.textMuted),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _HotlineChip(label: l10n.reportHotlinePolice, number: '122'),
                _HotlineChip(label: l10n.reportHotlineAmbulance, number: '123'),
                _HotlineChip(label: l10n.reportHotlineFire, number: '180'),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// One-tap call to an emergency number -- the fallback when no location can be
/// shared and the app cannot send a report.
class _HotlineChip extends StatelessWidget {
  const _HotlineChip({required this.label, required this.number});

  final String label;
  final String number;

  @override
  Widget build(BuildContext context) => ActionChip(
    avatar: const Icon(Icons.call, size: 16),
    label: Text(label),
    onPressed: () => launchUrl(Uri(scheme: 'tel', path: number)),
  );
}

class _MapButton extends StatelessWidget {
  const _MapButton({
    required this.child,
    required this.onPressed,
    required this.tooltip,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: p.surface.withValues(alpha: 0.95),
        shape: const CircleBorder(),
        elevation: 2,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(height: 44, width: 44, child: Center(child: child)),
        ),
      ),
    );
  }
}
