import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/states.dart';
import '../application/incident_providers.dart';
import '../data/incident_repository.dart';
import '../domain/incident.dart';
import 'widgets/cancel_incident_section.dart';
import 'widgets/injured_counter.dart';
import 'widgets/responder_tracking_map.dart';
import 'widgets/status_badges.dart';

class IncidentDetailScreen extends ConsumerStatefulWidget {
  const IncidentDetailScreen({required this.incidentId, super.key});

  final int incidentId;

  @override
  ConsumerState<IncidentDetailScreen> createState() => _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends ConsumerState<IncidentDetailScreen> {
  bool _editingCount = false;
  bool _savingCount = false;
  int _draftCount = 0;
  String? _error;

  Future<void> _saveCount(Incident incident) async {
    final l10n = context.l10n;
    setState(() {
      _savingCount = true;
      _error = null;
    });
    try {
      await ref.read(incidentRepositoryProvider).updateInjuredCount(incident.id, _draftCount);
      ref.invalidate(incidentProvider(incident.id));
      if (mounted) setState(() => _editingCount = false);
    } catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _savingCount = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();
    final state = ref.watch(incidentProvider(widget.incidentId));

    final incident = state.valueOrNull;
    if (incident == null) {
      return state.hasError
          ? ErrorView(
              message: describeError(l10n, state.error!),
              retryLabel: l10n.commonRetry,
              onRetry: () => ref.invalidate(incidentProvider(widget.incidentId)),
            )
          : LoadingView(label: l10n.commonLoading);
    }

    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackHeader(title: l10n.citizenIncidentDetailTitle, fallbackLocation: '/citizen'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              IncidentStatusBadge(status: incident.status),
              if (incident.aiPriority != null) PriorityBadge(priority: incident.aiPriority!),
            ],
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Column(
              children: [
                _Row(label: l10n.citizenIncidentDetailCategory, value: categoryLabel(l10n, incident.category)),
                _Row(
                  label: l10n.citizenIncidentDetailReportedAt,
                  value: DateFormat.yMMMd(locale).add_jm().format(incident.createdAt),
                ),
                _Row(
                  label: l10n.citizenIncidentDetailAddress,
                  value: incident.address ?? l10n.citizenIncidentDetailNoAddress,
                ),
                if (_editingCount)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Column(
                      children: [
                        InjuredCounter(value: _draftCount, onChanged: (v) => setState(() => _draftCount = v)),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: AppButton(
                                label: l10n.commonCancel,
                                variant: AppButtonVariant.secondary,
                                onPressed: _savingCount ? null : () => setState(() => _editingCount = false),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: AppButton(
                                label: l10n.commonSave,
                                loading: _savingCount,
                                onPressed: () => _saveCount(incident),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  )
                else
                  _Row(
                    label: l10n.citizenIncidentDetailInjured,
                    value: '${incident.injuredCount}',
                    trailing: incident.status.isEditableByCitizen
                        ? TextButton(
                            onPressed: () => setState(() {
                              _draftCount = incident.injuredCount;
                              _editingCount = true;
                            }),
                            child: Text(l10n.accountEditProfile),
                          )
                        : null,
                  ),
              ],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          if (incident.status == IncidentStatus.cancelled) ...[
            const SizedBox(height: 12),
            _CancellationNotice(incident: incident),
          ] else if (incident.status.isCancellableByCitizen) ...[
            const SizedBox(height: 16),
            if (incident.status.cancelNeedsReason) ...[
              ResponderTrackingMap(incident: incident),
              const SizedBox(height: 16),
            ],
            CancelIncidentSection(incident: incident),
          ] else if (incident.status == IncidentStatus.resolved) ...[
            const SizedBox(height: 16),
            ResponderTrackingMap(incident: incident),
          ],
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value, this.trailing});

  final String label;
  final String value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(label, style: TextStyle(fontSize: 13, color: p.textMuted)),
          ),
          Expanded(
            flex: 3,
            child: Text(value, style: TextStyle(fontSize: 15, color: p.text)),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

class _CancellationNotice extends StatelessWidget {
  const _CancellationNotice({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final category = incident.cancellationCategory;
    final reason = [
      if (category != null) cancellationCategoryLabel(l10n, category),
      if ((incident.cancellationReason ?? '').isNotEmpty) incident.cancellationReason!,
    ].join(' — ');

    return AppCard(
      color: p.surfaceAlt,
      child: Text(
        incident.closedAsFalseReport
            ? l10n.cancelIncidentClosedAsFalseReport
            : l10n.cancelIncidentCancelledNotice(reason),
        style: TextStyle(fontSize: 14, color: p.textMuted),
      ),
    );
  }
}
