import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';
import '../theme/app_palette.dart';

class AppTextField extends StatefulWidget {
  const AppTextField({
    super.key,
    this.label,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.errorText,
    this.hintText,
    this.obscureText = false,
    this.enabled = true,
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
  final String? errorText;
  final String? hintText;
  final bool obscureText;
  final bool enabled;
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

    OutlineInputBorder border(Color color) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: BorderSide(color: color),
        );

    return Material( // <-- Added Material wrapper to satisfy TextField & IconButton requirements
      color: Colors.transparent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (widget.label != null) ...[
            Text(
              widget.label!,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: p.text),
            ),
            const SizedBox(height: 6),
          ],
          TextField(
            controller: _controller,
            onChanged: widget.onChanged,
            enabled: widget.enabled,
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
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
              enabledBorder: border(hasError ? p.danger : (isDark ? AppColors.slate700 : AppColors.slate300)),
              focusedBorder: border(hasError ? p.danger : const Color(0xFF3B82F6)),
              disabledBorder: border(p.border),
              suffixIcon: widget.obscureText
                  ? IconButton(
                      onPressed: () => setState(() => _revealed = !_revealed),
                      icon: Icon(
                        _revealed ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 18,
                        color: p.textMuted,
                      ),
                    )
                  : null,
            ),
          ),
          if (hasError) ...[
            const SizedBox(height: 6),
            Text(widget.errorText!, style: TextStyle(fontSize: 12, color: p.danger)),
          ],
        ],
      ),
    );
  }
}