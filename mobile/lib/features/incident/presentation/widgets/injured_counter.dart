import 'package:flutter/material.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';

/// "People injured": a label with a compact − / + stepper.
class InjuredCounter extends StatelessWidget {
  const InjuredCounter({
    required this.value,
    required this.onChanged,
    super.key,
    this.max = 99,
  });

  final int value;
  final ValueChanged<int> onChanged;
  final int max;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: p.border),
      ),
      child: Row(
        children: [
          Icon(Icons.personal_injury_outlined, color: p.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              context.l10n.citizenReportInjuredCount,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
          ),
          _RoundButton(
            icon: Icons.remove,
            filled: false,
            onPressed: value > 0 ? () => onChanged(value - 1) : null,
          ),
          SizedBox(
            width: 40,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ),
          _RoundButton(
            icon: Icons.add,
            filled: true,
            onPressed: value < max ? () => onChanged(value + 1) : null,
          ),
        ],
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.filled,
    required this.onPressed,
  });

  final IconData icon;
  final bool filled;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final enabled = onPressed != null;
    final foreground = filled ? Colors.white : p.text;

    return Material(
      color: filled ? p.primary : p.surfaceAlt,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: SizedBox(
          height: 40,
          width: 40,
          child: Icon(
            icon,
            size: 20,
            color: enabled ? foreground : foreground.withValues(alpha: 0.4),
          ),
        ),
      ),
    );
  }
}
