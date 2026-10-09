import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_palette.dart';

enum BadgeTone { neutral, info, success, warning, danger }

class AppBadge extends StatelessWidget {
  const AppBadge({required this.label, super.key, this.tone = BadgeTone.neutral});

  final String label;
  final BadgeTone tone;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (background, foreground) = switch (tone) {
      BadgeTone.neutral => (p.surfaceAlt, p.textMuted),
      BadgeTone.info => (p.surfaceAlt, AppColors.blue600),
      BadgeTone.success => (AppColors.emerald500.withValues(alpha: 0.12), AppColors.emerald500),
      BadgeTone.warning => (AppColors.amber500.withValues(alpha: 0.14), AppColors.amber500),
      BadgeTone.danger => (p.danger.withValues(alpha: 0.12), p.danger),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(999)),
      child: Text(
        label,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: foreground),
      ),
    );
  }
}
