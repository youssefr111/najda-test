import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_palette.dart';

/// The SOS control: it must be held for ~2 seconds, which prevents accidental
/// alerts from a pocket tap. Screen-reader users get the same protection via a
/// long-press action (the standard "double-tap and hold" gesture).
class SosButton extends StatefulWidget {
  const SosButton({
    required this.label,
    required this.hint,
    required this.onTriggered,
    super.key,
    this.size = 230,
  });

  final String label;
  final String hint;
  final VoidCallback onTriggered;

  /// Outer diameter; everything inside scales from it so the button fits
  /// small phones and tablets alike.
  final double size;

  @override
  State<SosButton> createState() => _SosButtonState();
}

class _SosButtonState extends State<SosButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..addStatusListener((status) {
            if (status == AnimationStatus.completed) {
              HapticFeedback.heavyImpact();
              widget.onTriggered();
              _controller.reset();
            }
          });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _start() {
    HapticFeedback.selectionClick();
    _controller.forward();
  }

  void _cancel() {
    if (_controller.status != AnimationStatus.completed) _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final size = widget.size;
    final core = size * 0.71;
    final ring = size * 0.644;

    return Semantics(
      button: true,
      label: '${widget.label}. ${widget.hint}',
      onLongPress: widget.onTriggered,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => _start(),
        onTapUp: (_) => _cancel(),
        onTapCancel: _cancel,
        child: ExcludeSemantics(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) => SizedBox(
              width: size,
              height: size,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  _Disc(
                    diameter: size,
                    color: p.primary.withValues(alpha: 0.08),
                  ),
                  _Disc(
                    diameter: size * 0.852,
                    color: p.primary.withValues(alpha: 0.14),
                  ),
                  Transform.scale(
                    scale: 1 - 0.05 * _controller.value,
                    child: Container(
                      width: core,
                      height: core,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: p.primary,
                        boxShadow: [
                          BoxShadow(
                            color: p.primary.withValues(alpha: 0.4),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            widget.label,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: size * 0.157,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 4,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              widget.hint,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(
                    width: ring,
                    height: ring,
                    child: CircularProgressIndicator(
                      value: _controller.value,
                      strokeWidth: 5,
                      color: Colors.white,
                      backgroundColor: Colors.transparent,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Disc extends StatelessWidget {
  const _Disc({required this.diameter, required this.color});

  final double diameter;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    width: diameter,
    height: diameter,
    decoration: BoxDecoration(shape: BoxShape.circle, color: color),
  );
}
