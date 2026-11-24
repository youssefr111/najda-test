import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../application/kyc_providers.dart';
import '../domain/kyc.dart';
import 'kyc_widgets.dart';

/// Account -> Identity: the badge, what it means, and how to verify.
class KycCard extends ConsumerStatefulWidget {
  const KycCard({super.key});

  @override
  ConsumerState<KycCard> createState() => _KycCardState();
}

class _KycCardState extends ConsumerState<KycCard> {
  bool _starting = false;
  String? _error;

  Future<void> _start() async {
    setState(() {
      _starting = true;
      _error = null;
    });
    final error = await startKycVerification(context, ref);
    if (mounted) {
      setState(() {
        _starting = false;
        _error = error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final kyc = ref.watch(kycStateProvider);
    final state = kyc.value;
    if (state == null) {
      if (!kyc.hasError) return const SizedBox.shrink();
      // The status could not be loaded: say so instead of silently hiding the identity card.
      return AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l10n.kycTitle, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: p.text)),
            const SizedBox(height: 8),
            Text(describeError(l10n, kyc.error!), style: TextStyle(fontSize: 13, color: p.danger)),
            const SizedBox(height: 12),
            AppButton(
              label: l10n.commonRetry,
              variant: AppButtonVariant.secondary,
              onPressed: () => ref.invalidate(kycStateProvider),
            ),
          ],
        ),
      );
    }

    final label = switch (state.status) {
      KycStatus.notStarted => l10n.kycStart,
      KycStatus.inProgress => l10n.kycContinue,
      _ => l10n.kycTryAgain,
    };

    return KycAutoRefresh(
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(l10n.kycTitle, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: p.text)),
                ),
                KycBadge(status: state.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(l10n.kycDescription, style: TextStyle(fontSize: 13, color: p.textMuted)),
            const SizedBox(height: 12),
            Text(kycExplanation(l10n, state.status), style: TextStyle(fontSize: 14, height: 1.4, color: p.text)),
            if (state.status == KycStatus.declined && (state.declineReason ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('${l10n.kycReasonLabel}: ${state.declineReason}', style: TextStyle(fontSize: 12, color: p.textMuted)),
            ],
            if (state.required && !state.verified) ...[
              const SizedBox(height: 8),
              Text(l10n.kycRequiredHint, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: p.danger)),
            ],
            if (!state.providerConfigured) ...[
              const SizedBox(height: 8),
              Text(l10n.kycNotConfigured, style: TextStyle(fontSize: 12, color: p.warning)),
            ],
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
            ],
            if (state.status.canStart && state.providerConfigured) ...[
              const SizedBox(height: 14),
              AppButton(label: label, loading: _starting, onPressed: _start),
            ],
            if (state.status.isPending || state.status == KycStatus.notStarted) ...[
              const SizedBox(height: 8),
              AppButton(
                label: l10n.kycCheckStatus,
                variant: AppButtonVariant.secondary,
                onPressed: () => ref.invalidate(kycStateProvider),
              ),
            ],
            const SizedBox(height: 10),
            Text(l10n.kycPrivacy, style: TextStyle(fontSize: 11, color: p.textMuted)),
          ],
        ),
      ),
    );
  }
}
