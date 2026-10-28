import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_card.dart';
import '../domain/hospital_transfer.dart';

/// The latest reading in full plus a short history of what was sent before it.
/// [readings] must not be empty; they are sorted here, newest first.
class VitalsReadout extends StatelessWidget {
  const VitalsReadout({required this.readings, super.key});

  static const _historyLimit = 8;

  final List<VitalsReading> readings;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();
    // Date and time: this is also shown on past missions, where a bare time of day would be ambiguous.
    final time = DateFormat.yMMMd(locale).add_jm();

    final newestFirst = readings.toList()..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
    final latest = newestFirst.first;

    String value(Object? v, [String suffix = '']) => v == null ? '—' : '$v$suffix';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.vitalsPanelLatestVitals(time.format(latest.recordedAt)),
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: p.text),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 16,
                runSpacing: 8,
                children: [
                  _Metric(l10n.vitalsPanelHeartRate, value(latest.heartRate)),
                  _Metric(l10n.vitalsPanelBloodPressure, value(latest.bloodPressure)),
                  _Metric(l10n.vitalsPanelSpo2, value(latest.spo2, '%')),
                  _Metric(l10n.vitalsPanelRespiratoryRate, value(latest.respiratoryRate)),
                  _Metric(l10n.vitalsPanelTemperature, value(latest.temperatureCelsius, '°C')),
                  _Metric(
                    l10n.vitalsPanelConsciousness,
                    latest.consciousnessLevel == null ? '—' : consciousnessLabel(l10n, latest.consciousnessLevel!),
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
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: p.textMuted),
          ),
          const SizedBox(height: 4),
          for (final reading in newestFirst.skip(1).take(_historyLimit))
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Text(
                l10n.vitalsPanelHistoryRow(time.format(reading.recordedAt), value(reading.heartRate), value(reading.spo2)),
                style: TextStyle(fontSize: 12, color: p.textMuted),
              ),
            ),
        ],
      ],
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
        Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: p.text)),
      ],
    );
  }
}
