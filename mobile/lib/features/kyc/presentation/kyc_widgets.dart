import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/theme/app_palette.dart';
import '../application/kyc_providers.dart';
import '../data/kyc_repository.dart';
import '../domain/kyc.dart';

String kycStatusLabel(AppLocalizations l10n, KycStatus status) => switch (status) {
      KycStatus.notStarted => l10n.kycStatusNotStarted,
      KycStatus.inProgress => l10n.kycStatusInProgress,
      KycStatus.inReview => l10n.kycStatusInReview,
      KycStatus.verified => l10n.kycStatusVerified,
      KycStatus.declined => l10n.kycStatusDeclined,
      KycStatus.expired => l10n.kycStatusExpired,
      KycStatus.abandoned => l10n.kycStatusAbandoned,
    };

String kycExplanation(AppLocalizations l10n, KycStatus status) => switch (status) {
      KycStatus.notStarted => l10n.kycExplainNotStarted,
      KycStatus.inProgress => l10n.kycExplainInProgress,
      KycStatus.inReview => l10n.kycExplainInReview,
      KycStatus.verified => l10n.kycExplainVerified,
      KycStatus.declined => l10n.kycExplainDeclined,
      KycStatus.expired => l10n.kycExplainExpired,
      KycStatus.abandoned => l10n.kycExplainAbandoned,
    };

/// The verification badge (account pages, the identity screen).
class KycBadge extends StatelessWidget {
  const KycBadge({required this.status, super.key});

  final KycStatus status;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (color, icon) = switch (status) {
      KycStatus.verified => (p.success, Icons.verified_rounded),
      KycStatus.declined => (p.danger, Icons.gpp_bad_outlined),
      KycStatus.inProgress || KycStatus.inReview => (p.warning, Icons.hourglass_top_rounded),
      _ => (p.textMuted, Icons.shield_outlined),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 5),
          Text(
            kycStatusLabel(context.l10n, status),
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}

/// Refreshes the verification state whenever the app comes back to the foreground (the person has just finished in the
/// browser) and, while the provider is still working, every few seconds.
class KycAutoRefresh extends ConsumerStatefulWidget {
  const KycAutoRefresh({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<KycAutoRefresh> createState() => _KycAutoRefreshState();
}

class _KycAutoRefreshState extends ConsumerState<KycAutoRefresh> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) ref.invalidate(kycStateProvider);
  }

  @override
  Widget build(BuildContext context) {
    // While the provider is working, ask again every few seconds.
    ref.listen(kycStateProvider, (_, next) {
      final status = next.value?.status;
      if (status != null && status.isPending) {
        Future<void>.delayed(const Duration(seconds: 4), () {
          if (mounted) ref.invalidate(kycStateProvider);
        });
      }
    });
    return widget.child;
  }
}

/// Opens the hosted verification page in the browser. Returns an error message to show, or null.
Future<String?> startKycVerification(BuildContext context, WidgetRef ref) async {
  final l10n = context.l10n;
  try {
    final url = await ref.read(kycRepositoryProvider).startSession();
    if (url == null) {
      ref.invalidate(kycStateProvider); // already verified: nothing to open, just show the new status
      return null;
    }
    final opened = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    ref.invalidate(kycStateProvider);
    return opened ? null : l10n.kycOpenError;
  } catch (error) {
    return describeKycError(l10n, error);
  }
}

String describeKycError(AppLocalizations l10n, Object error) => describeError(l10n, error);
