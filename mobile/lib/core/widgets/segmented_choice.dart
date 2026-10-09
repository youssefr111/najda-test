import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_palette.dart';

/// Equal-width single-choice pills (gender, injured count, ...).
class SegmentedChoice<T> extends StatelessWidget {
  const SegmentedChoice({
    required this.options,
    required this.value,
    required this.labelOf,
    required this.onChanged,
    super.key,
  });

  final List<T> options;
  final T value;
  final String Function(T) labelOf;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: [
        for (var i = 0; i < options.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: Builder(
              builder: (context) {
                final selected = options[i] == value;
                return InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => onChanged(options[i]),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: selected ? p.surfaceAlt : p.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: selected ? AppColors.blue600 : p.border,
                        width: 1.5,
                      ),
                    ),
                    child: Text(
                      labelOf(options[i]),
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: selected ? AppColors.blue600 : p.text,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}
