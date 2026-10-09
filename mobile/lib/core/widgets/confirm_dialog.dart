import 'package:flutter/material.dart';

import '../l10n/l10n_x.dart';
import '../theme/app_palette.dart';

/// Awaitable confirmation dialog. Resolves `true` only on explicit confirm.
Future<bool> confirmAction(
  BuildContext context, {
  required String title,
  String? message,
  required String confirmLabel,
  bool destructive = false,
}) async {
  final p = context.palette;
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title, style: TextStyle(fontSize: 17, color: p.text)),
      content: message == null ? null : Text(message, style: TextStyle(color: p.textMuted)),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(context.l10n.commonCancel),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(true),
          style: TextButton.styleFrom(foregroundColor: destructive ? p.danger : p.primary),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return result ?? false;
}
