import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_card.dart';
import '../application/handoff_providers.dart';

/// The latest reading plus a short history of what has been sent so far.
class VitalsHistoryPanel extends ConsumerWidget {
  const VitalsHistoryPanel({required this.transferId, super.key});

  static const _historyLimit = 8;

  final int transferId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();
    final readings = ref.watch(vitalsHistoryProvider(transferId));

    return readings.when(
      loading: () => Text(
        l10n.vitalsPanelLoading,
        style: TextStyle(fontSize: 13, color: p.textMuted),
      ),
      error: (_, _) => const SizedBox.shrink(),
      data: (all) {
        if (all.isEmpty) {
          return Text(
            l10n.vitalsPanelNoVitals,
            style: TextStyle(fontSize: 13, color: p.textMuted),
          );
        }
        final newestFirst = all.toList()
          ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
        final latest = newestFirst.first;
        final time = DateFormat.jm(locale);

        String value(Object? v, [String suffix = '']) =>
            v == null ? '—' : '$v$suffix';

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppCard(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.vitalsPanelLatestVitals(
                      time.format(latest.recordedAt),
                    ),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 16,
                    runSpacing: 8,
                    children: [
                      _Metric(
                        l10n.vitalsPanelHeartRate,
                        value(latest.heartRate),
                      ),
                      _Metric(
                        l10n.vitalsPanelBloodPressure,
                        value(latest.bloodPressure),
                      ),
                      _Metric(l10n.vitalsPanelSpo2, value(latest.spo2, '%')),
                      _Metric(
                        l10n.vitalsPanelRespiratoryRate,
                        value(latest.respiratoryRate),
                      ),
                      _Metric(
                        l10n.vitalsPanelTemperature,
                        value(latest.temperatureCelsius, '°C'),
                      ),
                      _Metric(
                        l10n.vitalsPanelConsciousness,
                        latest.consciousnessLevel == null
                            ? '—'
                            : consciousnessLabel(
                                l10n,
                                latest.consciousnessLevel!,
                              ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (newestFirst.length > 1) ...[
              const SizedBox(height: 12),
              Text(
                l10n.vitalsPanelHistory,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: p.textMuted,
                ),
              ),
              const SizedBox(height: 4),
              for (final reading in newestFirst.take(_historyLimit))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text(
                    l10n.vitalsPanelHistoryRow(
                      time.format(reading.recordedAt),
                      value(reading.heartRate),
                      value(reading.spo2),
                    ),
                    style: TextStyle(fontSize: 12, color: p.textMuted),
                  ),
                ),
            ],
          ],
        );
      },
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: p.textSubtle)),
        Text(
          value,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: p.text,
          ),
        ),
      ],
    );
  }
}
