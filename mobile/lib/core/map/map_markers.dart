import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../features/responder/domain/unit.dart';

/// What one map marker looks like: a coloured disc with a white border and a white icon -- the
/// same visual language as the web app's markers, so an incident, a unit, a station and a hospital
/// are told apart by *icon and colour*, not by being the same dot.
class MarkerSpec {
  const MarkerSpec({required this.color, required this.icon, this.size = 32});

  final Color color;
  final IconData icon;

  /// Diameter in logical pixels.
  final double size;

  String get key => 'najda-${color.toARGB32().toRadixString(16)}-${icon.codePoint.toRadixString(16)}-${size.round()}';
}

/// The marker palette, matching the web app.
abstract final class MarkerPalette {
  static const incident = Color(0xFFDB313F);
  static const ownUnit = Color(0xFF2563EB);
  static const ownCrew = Color(0xFF9333EA);
  static const station = Color(0xFF0D9488);
  static const hospitalSelected = Color(0xFF2563EB);
  static const hospitalOwn = Color(0xFF9333EA);
  static const hospitalRecommended = Color(0xFF059669);
  static const hospitalOther = Color(0xFF64748B);

  /// Citizen view: a colour per unit type, none of them the incident's red.
  static Color forUnitType(UnitType type) => switch (type) {
        UnitType.ambulance => const Color(0xFF2563EB),
        UnitType.fireTruck => const Color(0xFFEA580C),
        UnitType.policeCar => const Color(0xFF4F46E5),
        UnitType.firstResponder => const Color(0xFF059669),
      };

  static Color fromHex(String hex) => Color(int.parse('FF${hex.substring(1)}', radix: 16));

  static String toHex(Color color) => '#${(color.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}';
}

IconData unitTypeIcon(UnitType type) => switch (type) {
      UnitType.ambulance => Icons.medical_services,
      UnitType.fireTruck => Icons.local_fire_department,
      UnitType.policeCar => Icons.local_police,
      UnitType.firstResponder => Icons.health_and_safety,
    };

/// Draws markers to PNG once and registers them with a map controller. One per map.
class MarkerRegistry {
  MarkerRegistry({required this.pixelRatio});

  /// Device pixel ratio: images are rendered at physical size so they stay sharp.
  final double pixelRatio;

  final _registered = <String>{};

  /// Call after every style load (a reloaded style forgets its images).
  void reset() => _registered.clear();

  /// Makes sure [spec]'s image exists on [controller] and returns its name.
  Future<String> ensure(MapLibreMapController controller, MarkerSpec spec) async {
    if (_registered.add(spec.key)) {
      await controller.addImage(spec.key, await _render(spec));
    }
    return spec.key;
  }

  Future<Uint8List> _render(MarkerSpec spec) async {
    final ratio = pixelRatio;
    final padding = 5 * ratio; // room for the soft shadow
    final diameter = spec.size * ratio;
    final canvasSize = diameter + padding * 2;
    final center = Offset(canvasSize / 2, canvasSize / 2);

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);

    canvas
      ..drawCircle(
        center + Offset(0, 1.5 * ratio),
        diameter / 2,
        Paint()
          ..color = Colors.black.withValues(alpha: 0.3)
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, 2.5 * ratio),
      )
      ..drawCircle(center, diameter / 2, Paint()..color = Colors.white)
      ..drawCircle(center, diameter / 2 - 2.2 * ratio, Paint()..color = spec.color);

    final glyph = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(spec.icon.codePoint),
        style: TextStyle(
          fontSize: spec.size * 0.5 * ratio,
          fontFamily: spec.icon.fontFamily,
          package: spec.icon.fontPackage,
          color: Colors.white,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    glyph.paint(canvas, center - Offset(glyph.width / 2, glyph.height / 2));

    final pixels = canvasSize.round();
    final image = await recorder.endRecording().toImage(pixels, pixels);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    return bytes!.buffer.asUint8List();
  }
}

/// Symbol options for [imageName] at [at], drawn from its centre.
SymbolOptions markerSymbol(LatLng at, String imageName, {int zIndex = 0}) =>
    SymbolOptions(geometry: at, iconImage: imageName, iconSize: 1, iconAnchor: 'center', zIndex: zIndex);
