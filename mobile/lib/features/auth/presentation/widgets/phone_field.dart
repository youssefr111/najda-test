import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';

/// Egyptian mobile number input: fixed `+20` prefix + 10 local digits.
/// Always laid out left-to-right (digits never mirror), like the web app.
///
/// One pill with the prefix inside it. The inner [TextFormField] is stripped of
/// every border/fill the app theme would otherwise add -- leaving any of them
/// on is what drew a second rounded box inside the first.
class PhoneField extends StatefulWidget {
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
  State<PhoneField> createState() => _PhoneFieldState();
}

class _PhoneFieldState extends State<PhoneField> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final borderColor = widget.hasError
        ? p.danger
        : _focused
        ? p.primary
        : p.border;

    return Material(
      color: Colors.transparent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.showLabel) ...[
            Padding(
              padding: const EdgeInsetsDirectional.only(start: 4),
              child: Text(
                l10n.authPhoneLabel,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: p.text,
                ),
              ),
            ),
            const SizedBox(height: 6),
          ],
          Directionality(
            textDirection: TextDirection.ltr,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 120),
              decoration: BoxDecoration(
                color: isDark ? p.surfaceAlt : p.surface,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: borderColor,
                  width: _focused || widget.hasError ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: 20, right: 12),
                    child: Text(
                      '+20',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: p.textMuted,
                      ),
                    ),
                  ),
                  Container(width: 1, height: 24, color: p.border),
                  Expanded(
                    child: Focus(
                      onFocusChange: (focused) =>
                          setState(() => _focused = focused),
                      child: TextFormField(
                        key: ValueKey(widget.enabled),
                        initialValue: widget.value,
                        enabled: widget.enabled,
                        onChanged: widget.onChanged,
                        keyboardType: TextInputType.number,
                        autofillHints: const [
                          AutofillHints.telephoneNumberNational,
                        ],
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(10),
                        ],
                        cursorColor: p.primary,
                        style: TextStyle(fontSize: 15, color: p.text),
                        decoration: InputDecoration(
                          hintText: '1012345678',
                          hintStyle: TextStyle(color: p.textSubtle),
                          filled: false,
                          isDense: true,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          disabledBorder: InputBorder.none,
                          errorBorder: InputBorder.none,
                          focusedErrorBorder: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 17,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (widget.hasError) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsetsDirectional.only(start: 4),
              child: Text(
                l10n.authPhoneInvalid,
                style: TextStyle(fontSize: 12, color: p.danger),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
