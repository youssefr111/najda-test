import 'package:flutter/material.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_palette.dart';

class InjuredCounter extends StatelessWidget {
  const InjuredCounter({required this.value, required this.onChanged, super.key});

  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: p.surfaceAlt, borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          const Icon(Icons.healing_outlined, size: 22, color: AppColors.emergency),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              context.l10n.citizenReportInjuredCount,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: p.text),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: p.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _RoundButton(
                  icon: Icons.remove,
                  background: p.surfaceAlt,
                  foreground: p.text,
                  onPressed: value > 0 ? () => onChanged(value - 1) : null,
                ),
                SizedBox(
                  width: 36,
                  child: Text(
                    '$value',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: p.text),
                  ),
                ),
                _RoundButton(
                  icon: Icons.add,
                  background: AppColors.emergency,
                  foreground: Colors.white,
                  onPressed: () => onChanged(value + 1),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.background,
    required this.foreground,
    required this.onPressed,
  });

  final IconData icon;
  final Color background;
  final Color foreground;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: SizedBox(
          height: 36,
          width: 36,
          child: Icon(icon, size: 18, color: onPressed == null ? foreground.withValues(alpha: 0.4) : foreground),
        ),
      ),
    );
  }
}
