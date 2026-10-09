import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Semantic colors for the current brightness, exposed as a [ThemeExtension]
/// so widgets never hard-code light/dark values.
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({
    required this.background,
    required this.surface,
    required this.surfaceAlt,
    required this.border,
    required this.text,
    required this.textMuted,
    required this.textSubtle,
    required this.primary,
    required this.onPrimary,
    required this.danger,
    required this.success,
    required this.warning,
  });

  final Color background;
  final Color surface;
  final Color surfaceAlt;
  final Color border;
  final Color text;
  final Color textMuted;
  final Color textSubtle;
  final Color primary;
  final Color onPrimary;
  final Color danger;
  final Color success;
  final Color warning;

  static const light = AppPalette(
    background: AppColors.slate50,
    surface: Colors.white,
    surfaceAlt: AppColors.slate100,
    border: AppColors.slate200,
    text: AppColors.slate900,
    textMuted: AppColors.slate500,
    textSubtle: AppColors.slate400,
    primary: AppColors.blue600,
    onPrimary: Colors.white,
    danger: AppColors.red600,
    success: AppColors.emerald600,
    warning: AppColors.amber500,
  );

  static const dark = AppPalette(
    background: AppColors.slate950,
    surface: AppColors.slate900,
    surfaceAlt: AppColors.slate800,
    border: AppColors.slate800,
    text: Color(0xFFF1F5F9),
    textMuted: AppColors.slate400,
    textSubtle: AppColors.slate500,
    primary: AppColors.blue600,
    onPrimary: Colors.white,
    danger: AppColors.red400,
    success: AppColors.emerald500,
    warning: AppColors.amber500,
  );

  @override
  AppPalette copyWith({
    Color? background,
    Color? surface,
    Color? surfaceAlt,
    Color? border,
    Color? text,
    Color? textMuted,
    Color? textSubtle,
    Color? primary,
    Color? onPrimary,
    Color? danger,
    Color? success,
    Color? warning,
  }) {
    return AppPalette(
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surfaceAlt: surfaceAlt ?? this.surfaceAlt,
      border: border ?? this.border,
      text: text ?? this.text,
      textMuted: textMuted ?? this.textMuted,
      textSubtle: textSubtle ?? this.textSubtle,
      primary: primary ?? this.primary,
      onPrimary: onPrimary ?? this.onPrimary,
      danger: danger ?? this.danger,
      success: success ?? this.success,
      warning: warning ?? this.warning,
    );
  }

  @override
  AppPalette lerp(ThemeExtension<AppPalette>? other, double t) {
    if (other is! AppPalette) return this;
    return AppPalette(
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceAlt: Color.lerp(surfaceAlt, other.surfaceAlt, t)!,
      border: Color.lerp(border, other.border, t)!,
      text: Color.lerp(text, other.text, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      textSubtle: Color.lerp(textSubtle, other.textSubtle, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
    );
  }
}

extension PaletteContext on BuildContext {
  AppPalette get palette => Theme.of(this).extension<AppPalette>()!;
}
