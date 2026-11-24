import 'package:flutter/material.dart';

/// Raw palette (Tailwind slate/blue values, kept identical to the Expo app),
/// plus the Najda brand red and the legacy aliases from the old `theme.dart`.
abstract final class AppColors {
  // ---------------------------------------------------------------------------
  // Brand
  // ---------------------------------------------------------------------------
  /// Najda brand red (light mode primary).
  static const brandRed = Color(0xFFD32F2F);

  /// Slightly lighter brand red used as primary in dark mode for contrast.
  static const brandRedDark = Color(0xFFE53935);

  /// Optional cyan accent (ColorScheme.secondary). Use only as an extra.
  static const cyan500 = Color(0xFF00BCD4);

  // ---------------------------------------------------------------------------
  // Raw palette
  // ---------------------------------------------------------------------------
  static const blue600 = Color(0xFF2563EB);
  static const blue800 = Color(0xFF1E40AF);

  static const slate50 = Color(0xFFF8FAFC);
  static const slate100 = Color(0xFFF1F5F9);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate300 = Color(0xFFCBD5E1);
  static const slate400 = Color(0xFF94A3B8);
  static const slate500 = Color(0xFF64748B);
  static const slate700 = Color(0xFF334155);
  static const slate800 = Color(0xFF1E293B);
  static const slate900 = Color(0xFF0F172A);
  static const slate950 = Color(0xFF020617);

  static const red600 = Color(0xFFDC2626);
  static const red400 = Color(0xFFF87171);
  static const emerald500 = Color(0xFF10B981);
  static const emerald600 = Color(0xFF059669);
  static const amber500 = Color(0xFFF59E0B);

  /// The emergency (SOS) accent used on the citizen report flow.
  static const emergency = Color(0xFFB7102A);
  static const emergencyPressed = Color(0xFF92001C);
  static const emergencyAccent = Color(0xFFDB313F);

  // ---------------------------------------------------------------------------
  // Legacy aliases (old mobile `theme.dart`) so existing `AppColors.x` calls,
  // including inside `const` widgets, keep compiling after the old file is
  // deleted. Prefer `context.palette` in new code (it follows dark mode).
  // ---------------------------------------------------------------------------
  static const primary = brandRed;
  static const background = slate50;
  static const foreground = slate900;
  static const card = Colors.white;
  static const accent = cyan500;
}
