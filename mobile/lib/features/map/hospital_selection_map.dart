import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../core/l10n/l10n_x.dart';
import '../../core/map/map_markers.dart';
import '../../core/theme/app_palette.dart';
import '../handoff/domain/hospital_transfer.dart';
import 'map_gestures.dart';
import 'najda_map_style.dart';

/// Pick a hospital on the map: the incident pin plus the relevant hospitals as icon markers --
/// selected (blue, larger) / your base (purple) / recommended (green) / other (grey), exactly the
/// web app's palette and precedence. Tap a marker to select it.
class HospitalSelectionMap extends StatefulWidget {
  const HospitalSelectionMap({
    required this.incidentLatitude,
    required this.incidentLongitude,
    required this.options,
    required this.selectedId,
    required this.onSelect,
    super.key,
    this.baseLatitude,
    this.baseLongitude,
  });

  final double incidentLatitude;
  final double incidentLongitude;
  final List<HospitalOption> options;
  final int? selectedId;
  final ValueChanged<int> onSelect;

  /// Where the crew's own unit is based. Drawn on its own when that base is not one of the hospitals (an
  /// ambulance station, say).
  final double? baseLatitude;
  final double? baseLongitude;

  bool get _hasSeparateBase => baseLatitude != null && baseLongitude != null && !options.any((o) => o.isOwnBase);

  bool get _hasBase => _hasSeparateBase || options.any((o) => o.isOwnBase);

  @override
  State<HospitalSelectionMap> createState() => _HospitalSelectionMapState();
}

class _HospitalSelectionMapState extends State<HospitalSelectionMap> {
  static const _mapHeight = 240.0;

  MapLibreMapController? _controller;
  MarkerRegistry? _markers;
  bool _styleLoaded = false;
  bool _disposed = false;
  bool _drawing = false;
  bool _redrawQueued = false;
  bool _framed = false;

  /// What is currently drawn. The parent rebuilds often (typing in the search box, live refreshes of the
  /// hospital list); redrawing on every rebuild wiped and re-added every marker, which is the flicker.
  String _drawnSignature = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _markers ??= MarkerRegistry(pixelRatio: MediaQuery.devicePixelRatioOf(context));
  }

  @override
  void dispose() {
    _disposed = true;
    _controller?.onSymbolTapped.remove(_onSymbolTapped);
    super.dispose();
  }

  /// The map only shows what matters: the recommended hospitals, your own base and the current selection
  /// (plus the incident). Any hospital picked from the list joins the map the moment it is selected.
  List<HospitalOption> get _visible {
    final shown = widget.options.where((o) => o.recommended || o.isOwnBase || o.id == widget.selectedId).toList();
    // Nothing recommended and no base: still show the nearest few so the map is never empty.
    return shown.isEmpty ? widget.options.take(3).toList() : shown;
  }

  String get _signature =>
      '${widget.incidentLatitude},${widget.incidentLongitude}|${widget.baseLatitude},${widget.baseLongitude}|'
      '${widget.selectedId}|${_visible.map((o) => '${o.id}:${o.recommended}:${o.isOwnBase}').join(',')}';

  @override
  void didUpdateWidget(HospitalSelectionMap oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Picked something new (from the map OR from the list below it): go and show it.
    if (widget.selectedId != null && widget.selectedId != oldWidget.selectedId) {
      unawaited(_flyToSelected());
    }
    if (_signature != _drawnSignature) unawaited(_redraw());
  }

  /// Same precedence as the web: selected, then your own base, then recommended, then the rest.
  static Color _colorFor(HospitalOption option, {required bool selected}) {
    if (selected) return MarkerPalette.hospitalSelected;
    if (option.isOwnBase) return MarkerPalette.hospitalOwn;
    if (option.recommended) return MarkerPalette.hospitalRecommended;
    return MarkerPalette.hospitalOther;
  }

  /// Serialised: map calls are async, and overlapping redraws would leave duplicate markers behind.
  /// Every image is prepared first, then the symbols are swapped in two quick calls (clear + one batch add)
  /// instead of one platform round-trip per marker.
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
      _drawnSignature = _signature;

      final symbols = <SymbolOptions>[];
      final data = <Map<String, dynamic>>[];

      // Unselected first, the selected one above them, the incident on top of everything.
      for (final option in _visible) {
        final selected = option.id == widget.selectedId;
        final image = await markers.ensure(
          controller,
          MarkerSpec(color: _colorFor(option, selected: selected), icon: Icons.apartment, size: selected ? 40 : 32),
        );
        symbols.add(
          markerSymbol(LatLng(option.hospital.latitude, option.hospital.longitude), image, zIndex: selected ? 2 : 1),
        );
        data.add({'hospitalId': option.id});
      }

      if (widget._hasSeparateBase) {
        final base = await markers.ensure(
          controller,
          const MarkerSpec(color: MarkerPalette.hospitalOwn, icon: Icons.home_work, size: 34),
        );
        symbols.add(markerSymbol(LatLng(widget.baseLatitude!, widget.baseLongitude!), base, zIndex: 2));
        data.add(const {});
      }

      final incident = await markers.ensure(
        controller,
        const MarkerSpec(color: MarkerPalette.incident, icon: Icons.location_on, size: 38),
      );
      symbols.add(markerSymbol(LatLng(widget.incidentLatitude, widget.incidentLongitude), incident, zIndex: 3));
      data.add(const {});

      if (_disposed) return;
      await controller.clearSymbols();
      if (_disposed) return;
      await controller.addSymbols(symbols, data);

      if (!_framed && widget.options.isNotEmpty) {
        _framed = true;
        await _frameVisible();
      }
    } finally {
      _drawing = false;
      if (_redrawQueued && !_disposed) {
        _redrawQueued = false;
        unawaited(_redraw());
      }
    }
  }

  /// Fit the incident and every marker on the map, so nothing (in particular your own base) is off-screen.
  Future<void> _frameVisible() => _fit([
        LatLng(widget.incidentLatitude, widget.incidentLongitude),
        for (final o in _visible) LatLng(o.hospital.latitude, o.hospital.longitude),
        if (widget._hasSeparateBase) LatLng(widget.baseLatitude!, widget.baseLongitude!),
      ]);

  /// Show the selected hospital together with the incident.
  Future<void> _flyToSelected() async {
    final selected = widget.options.where((o) => o.id == widget.selectedId).firstOrNull;
    if (selected == null) return;
    await _fit([
      LatLng(widget.incidentLatitude, widget.incidentLongitude),
      LatLng(selected.hospital.latitude, selected.hospital.longitude),
    ]);
  }

  Future<void> _fit(List<LatLng> points) async {
    final controller = _controller;
    if (_disposed || controller == null || points.isEmpty) return;

    final lats = points.map((p) => p.latitude);
    final lngs = points.map((p) => p.longitude);
    final south = lats.reduce(math.min);
    final north = lats.reduce(math.max);
    final west = lngs.reduce(math.min);
    final east = lngs.reduce(math.max);

    // Every point on (almost) the same spot: a bounds fit would zoom to infinity.
    if ((north - south).abs() < 1e-5 && (east - west).abs() < 1e-5) {
      await controller.animateCamera(CameraUpdate.newLatLngZoom(points.first, 15));
      return;
    }

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

  Future<void> _recenter() async =>
      _controller?.animateCamera(CameraUpdate.newLatLngZoom(LatLng(widget.incidentLatitude, widget.incidentLongitude), 14));

  void _onSymbolTapped(Symbol symbol) {
    final id = symbol.data?['hospitalId'];
    if (id is int) widget.onSelect(id);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            height: _mapHeight,
            child: Stack(
              children: [
                // Its own layer: list scrolling and typing in the search box repaint the page, not the map.
                RepaintBoundary(
                  child: MapLibreMap(
                    styleString: najdaMapStyle,
                    initialCameraPosition: CameraPosition(
                      target: LatLng(widget.incidentLatitude, widget.incidentLongitude),
                      zoom: 12,
                    ),
                    minMaxZoomPreference: najdaMapZoomLimits,
                    gestureRecognizers: mapGestureRecognizers,
                    compassEnabled: false,
                    rotateGesturesEnabled: false,
                    tiltGesturesEnabled: false,
                    onMapCreated: (controller) {
                      _controller = controller;
                      controller.onSymbolTapped.add(_onSymbolTapped);
                    },
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
                  top: 8,
                  start: 8,
                  child: Material(
                    color: p.surface.withValues(alpha: 0.95),
                    shape: const CircleBorder(),
                    elevation: 2,
                    child: IconButton(
                      tooltip: l10n.missionRouteMapRecenter,
                      onPressed: _recenter,
                      icon: Icon(Icons.my_location, size: 20, color: p.text),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(l10n.hospitalMapShowingHint, style: TextStyle(fontSize: 11, color: p.textMuted)),
        if (!widget._hasBase)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(l10n.hospitalMapNoBase, style: TextStyle(fontSize: 11, color: p.warning)),
          ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 12,
          runSpacing: 6,
          children: [
            _LegendDot(color: MarkerPalette.incident, label: l10n.hospitalLabelsIncidentLocation),
            _LegendDot(color: MarkerPalette.hospitalRecommended, label: l10n.hospitalLabelsRecommended),
            _LegendDot(color: MarkerPalette.hospitalOwn, label: l10n.hospitalLabelsYourBase),
            _LegendDot(color: MarkerPalette.hospitalSelected, label: l10n.hospitalLabelsSelected),
          ],
        ),
      ],
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(height: 10, width: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 12, color: context.palette.textMuted)),
        ],
      );
}