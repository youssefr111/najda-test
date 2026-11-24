import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/config/flavor.dart';
import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../../incident/application/outbox_controller.dart';

/// The report that is saved on the phone and on its way to dispatch: what is
/// happening to it, and what the citizen can do about it.
class OutboxBanner extends ConsumerWidget {
  const OutboxBanner({super.key});

  Future<void> _discard(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    final confirmed = await confirmAction(
      context,
      title: l10n.outboxDiscardConfirmTitle,
      message: l10n.outboxDiscardConfirmBody,
      confirmLabel: l10n.pendingDiscard,
      destructive: true,
    );
    if (confirmed) await ref.read(outboxControllerProvider.notifier).discard();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(outboxControllerProvider);
    final report = state.report;
    if (report == null) return const SizedBox.shrink();

    final l10n = context.l10n;
    final p = context.palette;
    final controller = ref.read(outboxControllerProvider.notifier);

    final sending = state.phase == OutboxPhase.sending;
    final stale = state.phase == OutboxPhase.needsConfirmation;
    final rejected = state.phase == OutboxPhase.rejected;

    // The report is already with dispatch; only its photos / recordings are still uploading.
    final uploadingEvidence = report.incidentId != null && !sending && !stale && !rejected;

    final accent = (stale || rejected) ? p.danger : p.warning;
    final icon = sending
        ? Icons.cloud_upload_outlined
        : (rejected ? Icons.error_outline : (stale ? Icons.warning_amber_rounded : Icons.cloud_off_outlined));
    final title = sending
        ? l10n.outboxSending
        : uploadingEvidence
            ? l10n.outboxUploadingTitle
            : (rejected ? l10n.outboxRejectedTitle : (stale ? l10n.pendingStaleTitle : l10n.pendingTitle));
    final body = sending
        ? l10n.outboxSendingBody
        : uploadingEvidence
            ? l10n.outboxUploadingBody
            : (rejected ? (state.error ?? l10n.commonError) : (stale ? l10n.pendingStaleBody : l10n.pendingBody));
    final savedAt = MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(report.capturedAt));

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: accent.withValues(alpha: 0.35)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                sending
                    ? SizedBox(
                        width: 24,
                        height: 24,
                        child: Padding(
                          padding: const EdgeInsets.all(2),
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: accent),
                        ),
                      )
                    : Icon(icon, color: accent),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: accent)),
                      const SizedBox(height: 2),
                      Text(body, style: TextStyle(fontSize: 13, height: 1.4, color: p.text)),
                      const SizedBox(height: 4),
                      Text(
                        '${l10n.pendingSavedAt} $savedAt',
                        style: TextStyle(fontSize: 11, color: p.textMuted),
                      ),
                      // Test / local builds show WHY it is waiting; production users never see this.
                      if (!Flavor.current.isProduction && state.error != null && !rejected)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            state.error!,
                            style: TextStyle(fontSize: 11, color: p.danger),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (!sending) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                      onPressed: () => stale ? controller.confirmStaleAndSend() : controller.trySend(manual: true),
                      child: Text(
                        stale ? l10n.pendingSendAnyway : (rejected ? l10n.commonRetry : l10n.pendingSendNow),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(minimumSize: const Size(0, 44)),
                      onPressed: () => _discard(context, ref),
                      child: Text(l10n.pendingDiscard, maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
