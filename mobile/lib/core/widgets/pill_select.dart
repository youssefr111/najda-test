import 'package:flutter/material.dart';

import '../theme/app_palette.dart';

/// A pill that looks like a text field and opens a picker when tapped (dates,
/// relationships...). Label above, current value (or hint) inside, chevron at
/// the end, optional clear button.
class PillSelect extends StatelessWidget {
  const PillSelect({
    required this.onTap,
    super.key,
    this.label,
    this.value,
    this.hint,
    this.icon,
    this.onClear,
    this.hasError = false,
  });

  final String? label;

  /// The chosen value's text; `null` shows [hint].
  final String? value;
  final String? hint;
  final IconData? icon;
  final VoidCallback onTap;
  final VoidCallback? onClear;
  final bool hasError;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasValue = value != null && value!.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 4),
            child: Text(
              label!,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ),
          const SizedBox(height: 6),
        ],
        Material(
          color: isDark ? p.surfaceAlt : p.surface,
          shape: StadiumBorder(
            side: BorderSide(color: hasError ? p.danger : p.border),
          ),
          child: InkWell(
            customBorder: const StadiumBorder(),
            onTap: onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 52),
              child: Padding(
                padding: const EdgeInsetsDirectional.only(start: 16, end: 8),
                child: Row(
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 20, color: p.textMuted),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: Text(
                        hasValue ? value! : (hint ?? ''),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          color: hasValue ? p.text : p.textMuted,
                        ),
                      ),
                    ),
                    if (hasValue && onClear != null)
                      IconButton(
                        onPressed: onClear,
                        icon: Icon(Icons.close, size: 18, color: p.textMuted),
                        visualDensity: VisualDensity.compact,
                      )
                    else
                      Icon(
                        Icons.keyboard_arrow_down_rounded,
                        color: p.textMuted,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
