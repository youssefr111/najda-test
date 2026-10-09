import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../application/auth_controller.dart';
import '../domain/auth_state.dart';

/// A failed or unreachable profile fetch is shown explicitly and is always
/// retryable -- never a spinner that silently never ends.
class ProfileErrorScreen extends ConsumerWidget {
  const ProfileErrorScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final auth = ref.watch(authControllerProvider);
    final message = auth is AuthProfileError ? auth.message : '';

    return ScreenScaffold(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              l10n.commonError,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: p.text),
            ),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: p.textMuted)),
            const SizedBox(height: 24),
            AppButton(
              label: l10n.commonRetry,
              onPressed: () => ref.read(authControllerProvider.notifier).retry(),
            ),
            const SizedBox(height: 8),
            AppButton(
              label: l10n.accountLogout,
              variant: AppButtonVariant.ghost,
              onPressed: () => ref.read(authControllerProvider.notifier).signOut(),
            ),
          ],
        ),
      ),
    );
  }
}
