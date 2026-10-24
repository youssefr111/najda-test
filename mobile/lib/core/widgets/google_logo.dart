import 'dart:math' as math;

import 'package:flutter/material.dart';

/// The four-colour Google "G", drawn natively so no asset or SVG package is
/// needed and it stays crisp at any size.
class GoogleLogo extends StatelessWidget {
  const GoogleLogo({super.key, this.size = 20});

  final double size;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: size,
    child: const CustomPaint(painter: _GoogleGPainter()),
  );
}

class _GoogleGPainter extends CustomPainter {
  const _GoogleGPainter();

  static const _blue = Color(0xFF4285F4);
  static const _red = Color(0xFFEA4335);
  static const _yellow = Color(0xFFFBBC05);
  static const _green = Color(0xFF34A853);

  static double _rad(double degrees) => degrees * math.pi / 180;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.2;
    final radius = (size.width - stroke) / 2;
    final center = size.center(Offset.zero);
    final rect = Rect.fromCircle(center: center, radius: radius);

    Paint ring(Color color) => Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.butt;

    // Angles are clockwise from 3 o'clock; the gap at the upper right is the
    // opening of the "G".
    canvas
      ..drawArc(rect, _rad(-45), _rad(-105), false, ring(_red))
      ..drawArc(rect, _rad(-150), _rad(-75), false, ring(_yellow))
      ..drawArc(rect, _rad(135), _rad(-90), false, ring(_green))
      ..drawArc(rect, _rad(45), _rad(-45), false, ring(_blue))
      ..drawRect(
        Rect.fromLTWH(
          center.dx,
          center.dy - stroke / 2,
          radius + stroke / 2,
          stroke,
        ),
        Paint()..color = _blue,
      );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
