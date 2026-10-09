import 'package:flutter/material.dart';

import '../theme/app_palette.dart';
import 'app_button.dart';

/// Full-screen spinner with an optional caption.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return ColoredBox(
      color: p.background,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: p.primary),
            if (label != null) ...[
              const SizedBox(height: 12),
              Text(label!, style: TextStyle(fontSize: 15, color: p.textMuted)),
            ],
          ],
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({required this.title, super.key, this.body});

  final String title;
  final String? body;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: p.text),
            ),
            if (body != null) ...[
              const SizedBox(height: 4),
              Text(body!, textAlign: TextAlign.center, style: TextStyle(fontSize: 15, color: p.textMuted)),
            ],
          ],
        ),
      ),
    );
  }
}

/// A retryable error block for failed queries.
class ErrorView extends StatelessWidget {
  const ErrorView({required this.message, required this.retryLabel, required this.onRetry, super.key});

  final String message;
  final String retryLabel;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: p.textMuted)),
            const SizedBox(height: 16),
            AppButton(label: retryLabel, onPressed: onRetry, expand: false),
          ],
        ),
      ),
    );
  }
}
