import 'package:flutter/material.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../domain/incident.dart';

/// "Reported for someone else": shown wherever responders and dispatch read a report, so the reporter's
/// own details are never taken for the patient's. Renders nothing for an ordinary (self) report.
class ReportedForBadge extends StatelessWidget {
  const ReportedForBadge({required this.reportedFor, super.key});

  final ReportedFor reportedFor;

  @override
  Widget build(BuildContext context) {
    if (reportedFor == ReportedFor.self) return const SizedBox.shrink();
    final l10n = context.l10n;
    final p = context.palette;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.warning.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.warning.withValues(alpha: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.groups_2_outlined, size: 20, color: p.warning),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.reportedForOtherBadge, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: p.text)),
                const SizedBox(height: 2),
                Text(l10n.reportedForOtherNote, style: TextStyle(fontSize: 12, color: p.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
