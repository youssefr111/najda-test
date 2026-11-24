import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/status/backend_status.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';

class StatusScreen extends ConsumerWidget {
  const StatusScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final health = ref.watch(backendStatusProvider);
    final locale = Localizations.localeOf(context).toString();

    final (title, summary, color) = switch (health.status) {
      BackendStatus.checking => (l10n.statusChecking, null, p.textMuted),
      BackendStatus.online => (
        l10n.statusOnline,
        l10n.statusAllGood,
        AppColors.emerald500,
      ),
      BackendStatus.waking => (
        l10n.statusWaking,
        l10n.statusWakingSummary,
        AppColors.amber500,
      ),
      BackendStatus.degraded => (
        l10n.statusDegraded,
        l10n.statusDegradedSummary,
        AppColors.amber500,
      ),
      BackendStatus.offline => (
        l10n.statusOffline,
        l10n.statusYourConnection,
        AppColors.red600,
      ),
      BackendStatus.unreachable => (
        l10n.statusUnreachable,
        l10n.statusUnreachableSummary,
        AppColors.red600,
      ),
    };

    String componentName(String key) => switch (key) {
      'api' => l10n.statusComponentApi,
      'database' => l10n.statusComponentDatabase,
      'auth' => l10n.statusComponentAuth,
      _ => key,
    };

    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackHeader(title: l10n.statusTitle, fallbackLocation: '/'),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      height: 12,
                      width: 12,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: color,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                  ],
                ),
                if (summary != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    summary,
                    style: TextStyle(fontSize: 14, color: p.textMuted),
                  ),
                ],
              ],
            ),
          ),
          if (health.components.isNotEmpty) ...[
            const SizedBox(height: 12),
            AppCard(
              child: Column(
                children: [
                  for (final entry in health.components.entries)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              componentName(entry.key),
                              style: TextStyle(fontSize: 15, color: p.text),
                            ),
                          ),
                          Text(
                            entry.value ? l10n.statusUp : l10n.statusDown,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: entry.value
                                  ? AppColors.emerald500
                                  : AppColors.red600,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          if (health.latencyMs != null)
            Text(
              l10n.statusResponseTime(health.latencyMs!),
              style: TextStyle(fontSize: 13, color: p.textMuted),
            ),
          Text(
            health.checkedAt == null
                ? l10n.statusNoData
                : l10n.statusLastChecked(
                    DateFormat.jms(locale).format(health.checkedAt!),
                  ),
            style: TextStyle(fontSize: 13, color: p.textMuted),
          ),
          const SizedBox(height: 16),
          AppButton(
            label: l10n.commonRetry,
            variant: AppButtonVariant.secondary,
            onPressed: () => ref.read(backendStatusProvider.notifier).refresh(),
          ),
        ],
      ),
    );
  }
}
