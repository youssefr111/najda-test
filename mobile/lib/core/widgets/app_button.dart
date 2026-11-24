import 'package:flutter/material.dart';

import '../theme/app_palette.dart';

enum AppButtonVariant { primary, secondary, danger, ghost }

/// The app's one button: pill-shaped, 52dp tall, brand-red when primary.
class AppButton extends StatelessWidget {
  const AppButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.variant = AppButtonVariant.primary,
    this.loading = false,
    this.expand = true,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool loading;
  final bool expand;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final enabled = onPressed != null && !loading;
    const shape = StadiumBorder();
    const minimumSize = Size(0, 52);

    final (foreground, spinner) = switch (variant) {
      AppButtonVariant.primary ||
      AppButtonVariant.danger => (Colors.white, Colors.white),
      AppButtonVariant.secondary => (p.text, p.primary),
      AppButtonVariant.ghost => (p.primary, p.primary),
    };

    final text = Text(
      label,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
    );

    final child = loading
        ? SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: spinner),
          )
        : icon == null
        ? text
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20),
              const SizedBox(width: 8),
              Flexible(child: text),
            ],
          );

    final Widget button = switch (variant) {
      AppButtonVariant.primary || AppButtonVariant.danger => FilledButton(
        onPressed: enabled ? onPressed : null,
        style: FilledButton.styleFrom(
          backgroundColor: variant == AppButtonVariant.danger
              ? p.danger
              : p.primary,
          foregroundColor: foreground,
          minimumSize: minimumSize,
          shape: shape,
        ),
        child: child,
      ),
      AppButtonVariant.secondary => OutlinedButton(
        onPressed: enabled ? onPressed : null,
        style: OutlinedButton.styleFrom(
          foregroundColor: foreground,
          minimumSize: minimumSize,
          shape: shape,
          side: BorderSide(color: p.border),
          backgroundColor: p.surface,
        ),
        child: child,
      ),
      AppButtonVariant.ghost => TextButton(
        onPressed: enabled ? onPressed : null,
        style: TextButton.styleFrom(
          foregroundColor: foreground,
          minimumSize: minimumSize,
          shape: shape,
        ),
        child: child,
      ),
    };

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}
