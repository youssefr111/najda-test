import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/states.dart';
import '../../auth/application/auth_controller.dart';
import '../application/kyc_providers.dart';
import 'kyc_widgets.dart';
import 'verify_account_card.dart';

/// Shown instead of the report form while something is missing: it lists what, and sends the person to their
/// Account page where each step is done. It never leaves someone with nowhere to go in a real emergency: the
/// emergency numbers are right on this screen.
class VerifyAccountScreen extends ConsumerWidget {
  const VerifyAccountScreen({super.key});

  Future<void> _call(String number) => launchUrl(Uri(scheme: 'tel', path: number));

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final user = ref.watch(currentUserProvider);
    final kyc = ref.watch(kycStateProvider);
    final missing = ref.watch(reportRequirementsProvider);
    final state = kyc.value;

    if (user == null) return LoadingView(label: l10n.commonLoading);
    if (state == null) {
      return kyc.hasError
          ? ErrorView(
              message: describeError(l10n, kyc.error!),
              retryLabel: l10n.commonRetry,
              onRetry: () => ref.invalidate(kycStateProvider),
            )
          : LoadingView(label: l10n.commonLoading);
    }

    // Identity is only listed when the server requires it of this person.
    final identityShown = state.required;
    final ready = !missing.email && !missing.phone && !missing.identity;

    return KycAutoRefresh(
      child: ScreenScaffold(
        scroll: true,
        onRefresh: () async {
          ref.invalidate(kycStateProvider);
          await ref.read(authControllerProvider.notifier).refreshProfile();
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            BackHeader(
              title: l10n.becomeResponderPageVerifyFirstTitle,
              fallbackLocation: areaOf(context),
            ),
            const SizedBox(height: 16),
            VerifyAccountCard(
              body: identityShown ? l10n.verifyAccountReportBodyBoth : l10n.verifyAccountReportBodyContact,
              requirements: [
                VerificationRequirement(label: l10n.becomeResponderPageEmailStep, done: user.emailVerified),
                VerificationRequirement(label: l10n.becomeResponderPagePhoneStep, done: user.phoneVerified),
                if (identityShown)
                  VerificationRequirement(label: l10n.becomeResponderPageIdentityStep, done: state.verified),
              ],
              onGoToAccount: () => context.go('${areaOf(context)}/account'),
            ),
            if (ready) ...[
              const SizedBox(height: 12),
              AppButton(
                label: l10n.kycBackToHome,
                variant: AppButtonVariant.secondary,
                onPressed: () => Navigator.of(context).maybePop(),
              ),
            ],
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: p.danger.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: p.danger.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.kycEmergencyNow,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: p.danger),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final (number, name) in [
                        ('122', l10n.kycPolice),
                        ('123', l10n.kycAmbulance),
                        ('180', l10n.kycFire),
                      ])
                        OutlinedButton.icon(
                          onPressed: () => _call(number),
                          icon: const Icon(Icons.call_rounded, size: 18),
                          label: Text('$number  $name'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}