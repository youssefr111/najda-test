import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';
import '../theme/app_palette.dart';

/// Pill-shaped text field with the label above it. Multi-line fields use a
/// softer corner radius so the shape still reads well when taller.
class AppTextField extends StatefulWidget {
  const AppTextField({
    super.key,
    this.label,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.onSubmitted,
    this.errorText,
    this.hintText,
    this.prefixIcon,
    this.obscureText = false,
    this.enabled = true,
    this.autofocus = false,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.textCapitalization = TextCapitalization.none,
    this.inputFormatters,
    this.maxLines = 1,
    this.minLines,
    this.maxLength,
  });

  final String? label;
  final TextEditingController? controller;
  final String? initialValue;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final String? errorText;
  final String? hintText;
  final IconData? prefixIcon;
  final bool obscureText;
  final bool enabled;
  final bool autofocus;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final TextCapitalization textCapitalization;
  final List<TextInputFormatter>? inputFormatters;
  final int? maxLines;
  final int? minLines;
  final int? maxLength;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  late final TextEditingController _controller =
      widget.controller ?? TextEditingController(text: widget.initialValue);
  bool _revealed = false;

  @override
  void dispose() {
    if (widget.controller == null) _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasError = widget.errorText != null;
    final singleLine = widget.obscureText || widget.maxLines == 1;
    final radius = BorderRadius.circular(singleLine ? 28 : 20);

    OutlineInputBorder border(Color color, {double width = 1}) =>
        OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: color, width: width),
        );

    return Material(
      color: Colors.transparent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (widget.label != null) ...[
            Padding(
              padding: const EdgeInsetsDirectional.only(start: 4),
              child: Text(
                widget.label!,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: p.text,
                ),
              ),
            ),
            const SizedBox(height: 6),
          ],
          TextField(
            controller: _controller,
            onChanged: widget.onChanged,
            onSubmitted: widget.onSubmitted,
            enabled: widget.enabled,
            autofocus: widget.autofocus,
            obscureText: widget.obscureText && !_revealed,
            keyboardType: widget.keyboardType,
            textInputAction: widget.textInputAction,
            autofillHints: widget.autofillHints,
            textCapitalization: widget.textCapitalization,
            inputFormatters: widget.inputFormatters,
            maxLines: widget.obscureText ? 1 : widget.maxLines,
            minLines: widget.minLines,
            maxLength: widget.maxLength,
            style: TextStyle(fontSize: 15, color: p.text),
            cursorColor: p.primary,
            decoration: InputDecoration(
              hintText: widget.hintText,
              hintStyle: TextStyle(color: p.textMuted),
              counterText: '',
              filled: true,
              fillColor: isDark ? p.surfaceAlt : p.surface,
              contentPadding: EdgeInsets.symmetric(
                horizontal: widget.prefixIcon == null ? 20 : 12,
                vertical: 15,
              ),
              prefixIcon: widget.prefixIcon == null
                  ? null
                  : Icon(widget.prefixIcon, size: 20, color: p.textMuted),
              enabledBorder: border(
                hasError
                    ? p.danger
                    : (isDark ? AppColors.slate700 : AppColors.slate300),
              ),
              focusedBorder: border(
                hasError ? p.danger : p.primary,
                width: 1.5,
              ),
              disabledBorder: border(p.border),
              suffixIcon: widget.obscureText
                  ? IconButton(
                      onPressed: () => setState(() => _revealed = !_revealed),
                      icon: Icon(
                        _revealed
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 20,
                        color: p.textMuted,
                      ),
                    )
                  : null,
            ),
          ),
          if (hasError) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsetsDirectional.only(start: 4),
              child: Text(
                widget.errorText!,
                style: TextStyle(fontSize: 12, color: p.danger),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
