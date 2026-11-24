import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../features/auth/application/auth_controller.dart';
import '../l10n/l10n_x.dart';
import '../theme/app_palette.dart';
import '../widgets/app_button.dart';
import '../widgets/app_logo.dart';
import 'app_lock.dart';

/// Covers the whole app while it is locked. Asks to unlock by itself as it
/// appears; the button is there if the prompt is dismissed.
///
/// Two ways out that never need the owner's finger: emergency numbers one tap
/// away (an emergency app must not trap a bystander who needs to call for
/// help), and logging out.
class LockScreen extends ConsumerStatefulWidget {
  const LockScreen({super.key});

  @override
  ConsumerState<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<LockScreen> {
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    // Let the screen paint first, then ask.
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_unlock()));
  }

  Future<void> _unlock() async {
    final verified = await ref
        .read(appLockProvider.notifier)
        .unlock(reason: context.l10n.lockReason);
    if (!verified && mounted) setState(() => _failed = true);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Material(
      color: p.background,
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(child: AppLogo(size: 112)),
                  const SizedBox(height: 20),
                  Text(
                    l10n.lockTitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _failed ? l10n.lockFailed : l10n.lockSubtitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.4,
                      color: _failed ? p.danger : p.textMuted,
                    ),
                  ),
                  const SizedBox(height: 28),
                  AppButton(
                    label: l10n.lockUnlock,
                    icon: Icons.fingerprint_rounded,
                    onPressed: _unlock,
                  ),
                  const SizedBox(height: 8),
                  AppButton(
                    label: l10n.accountLogout,
                    variant: AppButtonVariant.ghost,
                    onPressed: () =>
                        ref.read(authControllerProvider.notifier).signOut(),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    l10n.lockEmergencyHint,
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: p.textMuted),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final (label, number) in [
                        (l10n.reportHotlinePolice, '122'),
                        (l10n.reportHotlineAmbulance, '123'),
                        (l10n.reportHotlineFire, '180'),
                      ])
                        ActionChip(
                          avatar: const Icon(Icons.call, size: 16),
                          label: Text(label),
                          onPressed: () => unawaited(
                            launchUrl(Uri(scheme: 'tel', path: number)),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
