import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_badge.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/section_label.dart';
import '../application/handoff_providers.dart';
import '../domain/hospital_transfer.dart';
import 'vitals_readout.dart';

/// The ambulance crew's patient vitals for an incident, live -- for any mission screen, current or past.
/// Draws nothing (not even its spacing) when there is nothing the signed-in user may see.
class IncidentVitalsSection extends ConsumerWidget {
  const IncidentVitalsSection({required this.incidentId, super.key});

  final int incidentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final transfers = ref.watch(incidentVitalsProvider(incidentId)).value;
    if (transfers == null || transfers.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SectionLabel(l10n.incidentVitalsTitle),
          const SizedBox(height: 8),
          for (final transfer in transfers)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              text: l10n.incidentVitalsTransferTo(transfer.destinationName),
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: p.text),
                              children: [
                                if (transfer.unitPlateNumber != null)
                                  TextSpan(
                                    text: ' · ${transfer.unitPlateNumber}',
                                    style: TextStyle(fontWeight: FontWeight.w400, color: p.textMuted),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        AppBadge(label: transferStatusLabel(l10n, transfer.status), tone: _tone(transfer.status)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (transfer.updates.isEmpty)
                      Text(l10n.incidentVitalsNoneYet, style: TextStyle(fontSize: 13, color: p.textMuted))
                    else
                      VitalsReadout(readings: transfer.updates),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  static BadgeTone _tone(TransferStatus status) => switch (status) {
    TransferStatus.selected => BadgeTone.neutral,
    TransferStatus.enRoute => BadgeTone.warning,
    TransferStatus.arrived => BadgeTone.success,
  };
}
