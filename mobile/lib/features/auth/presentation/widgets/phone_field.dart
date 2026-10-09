import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';

/// Egyptian mobile number input: fixed `+20` prefix + 10 local digits.
/// Always laid out left-to-right (digits never mirror), like the web app.
class PhoneField extends StatelessWidget {
  const PhoneField({
    required this.value,
    required this.onChanged,
    super.key,
    this.showLabel = true,
    this.enabled = true,
    this.hasError = false,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final bool showLabel;
  final bool enabled;
  final bool hasError;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final borderColor = hasError ? p.danger : p.border;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showLabel) ...[
          Text(
            l10n.authPhoneLabel,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: p.text),
          ),
          const SizedBox(height: 6),
        ],
        Directionality(
          textDirection: TextDirection.ltr,
          child: Container(
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  decoration: BoxDecoration(
                    color: p.surfaceAlt,
                    border: Border(right: BorderSide(color: borderColor)),
                  ),
                  child: Text('+20', style: TextStyle(fontSize: 14, color: p.textMuted)),
                ),
                Expanded(
                  child: TextFormField(
                    key: ValueKey(enabled),
                    initialValue: value,
                    enabled: enabled,
                    onChanged: onChanged,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(10),
                    ],
                    style: TextStyle(fontSize: 14, color: p.text),
                    decoration: InputDecoration(
                      hintText: '1012345678',
                      hintStyle: TextStyle(color: p.textSubtle),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 6),
          Text(l10n.authPhoneInvalid, style: TextStyle(fontSize: 12, color: p.danger)),
        ],
      ],
    );
  }
}
