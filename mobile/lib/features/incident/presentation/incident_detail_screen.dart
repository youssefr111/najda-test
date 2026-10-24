import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/states.dart';
import '../../chat/presentation/incident_chat_panel.dart';
import '../../responder/domain/mission.dart';
import '../../guidance/presentation/guidance_panel.dart';
import '../application/incident_providers.dart';
import '../data/incident_repository.dart';
import '../domain/incident.dart';
import 'evidence/incident_evidence_section.dart';
import 'widgets/cancel_incident_sheet.dart';
import 'widgets/incident_progress.dart';
import 'widgets/injured_counter.dart';
import 'widgets/responder_tracking_map.dart';


/// The citizen's report: where it stands, who is coming (live), the details and
/// evidence they gave, the chat with responders, and -- while it is still
/// allowed -- a way to cancel.
class IncidentDetailScreen extends ConsumerStatefulWidget {
  const IncidentDetailScreen({required this.incidentId, super.key});

  final int incidentId;

  @override
  ConsumerState<IncidentDetailScreen> createState() =>
      _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends ConsumerState<IncidentDetailScreen> {
  bool _editingCount = false;
  bool _savingCount = false;
  int _draftCount = 0;
  String? _error;

  Future<void> _refresh() async {
    ref
      ..invalidate(incidentProvider(widget.incidentId))
      ..invalidate(incidentRespondersProvider(widget.incidentId));
    await ref.read(incidentProvider(widget.incidentId).future);
  }

  Future<void> _saveCount(Incident incident) async {
    final l10n = context.l10n;
    setState(() {
      _savingCount = true;
      _error = null;
    });
    try {
      await ref
          .read(incidentRepositoryProvider)
          .updateInjuredCount(incident.id, _draftCount);
      ref.invalidate(incidentProvider(incident.id));
      if (mounted) setState(() => _editingCount = false);
    } catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _savingCount = false);
    }
  }

  Future<void> _cancel(Incident incident) async {
    final cancelled = await showCancelIncidentSheet(context, incident);
    if (cancelled && mounted) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(context.l10n.reportCancelled)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();
    final state = ref.watch(incidentProvider(widget.incidentId));

    final incident = state.value;
    if (incident == null) {
      return state.hasError
          ? ErrorView(
              message: describeError(l10n, state.error!),
              retryLabel: l10n.commonRetry,
              onRetry: () =>
                  ref.invalidate(incidentProvider(widget.incidentId)),
            )
          : LoadingView(label: l10n.commonLoading);
    }

    final responders =
        ref.watch(incidentRespondersProvider(incident.id)).value ?? const [];
    final cancelled = incident.status == IncidentStatus.cancelled;
    final resolved = incident.status == IncidentStatus.resolved;
    final active = incident.status.isCancellableByCitizen;

    // The backend refuses to cancel once a unit is on scene, so don't offer it.
    final unitOnScene = responders.any(
      (r) =>
          r.status == MissionStatus.arrived ||
          r.status == MissionStatus.completed,
    );
    final canCancel = active && !unitOnScene;
    final showMap =
        (active && incident.status.cancelNeedsReason) ||
        resolved ||
        responders.isNotEmpty;

    return ScreenScaffold(
      scroll: true,
      onRefresh: _refresh,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackHeader(
            title: '${l10n.reportNumber} #${incident.id}',
            fallbackLocation: areaOf(context),
          ),
          if (cancelled)
            _CancellationNotice(incident: incident)
          else
            IncidentProgressCard(incident: incident, responders: responders),
          if (!cancelled) ...[
            if (showMap) ...[
              const SizedBox(height: 16),
              ResponderTrackingMap(incident: incident),
            ],
            const SizedBox(height: 16),
            ResponderUnitsSection(incident: incident, responders: responders),
          ],
          const SizedBox(height: 16),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  l10n.details,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 8),
                _Row(
                  icon: Icons.category_outlined,
                  label: l10n.citizenIncidentDetailCategory,
                  value: categoryLabel(l10n, incident.category),
                ),
                _Row(
                  icon: Icons.schedule,
                  label: l10n.citizenIncidentDetailReportedAt,
                  value: DateFormat.yMMMd(
                    locale,
                  ).add_jm().format(incident.createdAt),
                ),
                _Row(
                  icon: Icons.place_outlined,
                  label: l10n.citizenIncidentDetailAddress,
                  value:
                      incident.address ?? l10n.citizenIncidentDetailNoAddress,
                ),
                if (_editingCount)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        InjuredCounter(
                          value: _draftCount,
                          onChanged: (v) => setState(() => _draftCount = v),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: AppButton(
                                label: l10n.commonCancel,
                                variant: AppButtonVariant.secondary,
                                onPressed: _savingCount
                                    ? null
                                    : () =>
                                          setState(() => _editingCount = false),
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
                    icon: Icons.personal_injury_outlined,
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
          const SizedBox(height: 16),
          IncidentEvidenceSection(incident: incident, isOwner: true),
          IncidentChatPanel(
            incidentId: incident.id,
            readOnly: resolved || cancelled,
          ),
          if (canCancel) ...[
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () => _cancel(incident),
              icon: const Icon(Icons.cancel_outlined, size: 20),
              label: Text(
                l10n.cancelReport,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: p.danger,
                side: BorderSide(color: p.danger.withValues(alpha: 0.5)),
                shape: const StadiumBorder(),
              ),
            ),
          ] else if (active && unitOnScene) ...[
            const SizedBox(height: 16),
            Text(
              l10n.trackingCannotCancel,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: p.textMuted),
            ),
          ],
          if (active) ...[
            const SizedBox(height: 16),
            GuidancePanel(
              category: incident.category,
              injuredCount: incident.injuredCount,
            ),
          ],
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.label,
    required this.value,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final String value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: p.textMuted),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 12, color: p.textMuted)),
                const SizedBox(height: 2),
                Text(value, style: TextStyle(fontSize: 15, color: p.text)),
              ],
            ),
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
      if ((incident.cancellationReason ?? '').isNotEmpty)
        incident.cancellationReason!,
    ].join(' — ');

    return AppCard(
      color: p.surfaceAlt,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.cancel_outlined, color: p.textMuted),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              incident.closedAsFalseReport
                  ? l10n.cancelIncidentClosedAsFalseReport
                  : l10n.cancelIncidentCancelledNotice(reason),
              style: TextStyle(fontSize: 14, height: 1.45, color: p.textMuted),
            ),
          ),
        ],
      ),
    );
  }
}
