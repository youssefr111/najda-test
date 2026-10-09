import 'package:flutter/material.dart';

/// Raw palette (Tailwind slate/blue values, kept identical to the Expo app).
abstract final class AppColors {
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
}
