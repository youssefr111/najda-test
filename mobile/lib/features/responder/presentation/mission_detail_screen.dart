import '../../../core/location/own_position.dart';
import '../../handoff/application/handoff_providers.dart';
import '../../handoff/domain/hospital_transfer.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/states.dart';
import '../../incident/application/incident_providers.dart';
import '../../incident/domain/incident.dart';
import '../../incident/presentation/widgets/reported_for_badge.dart';
import '../../incident/presentation/widgets/status_badges.dart';
import '../../incident/presentation/evidence/incident_evidence_section.dart';
import '../../chat/presentation/incident_chat_panel.dart';
import '../../handoff/presentation/hospital_transfer_panel.dart';
import '../../map/mission_route_map.dart';
import '../../medical/presentation/widgets/patient_medical_profile_panel.dart';
import '../application/responder_providers.dart';
import '../application/teammate_providers.dart';
import '../data/responder_repository.dart';
import '../domain/mission.dart';
import '../domain/teammate_unit.dart';
import '../domain/unit.dart';

class MissionDetailScreen extends ConsumerStatefulWidget {
  const MissionDetailScreen({required this.missionId, super.key});

  final int missionId;

  @override
  ConsumerState<MissionDetailScreen> createState() =>
      _MissionDetailScreenState();
}

class _MissionDetailScreenState extends ConsumerState<MissionDetailScreen> {
  final _reason = TextEditingController();

  bool _rejecting = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  /// Runs a mission mutation, then refreshes the list that feeds this screen.
  Future<void> _run(
    Future<Object?> Function() action, {
    bool popAfter = false,
  }) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      ref.invalidate(myMissionsProvider);
      ref.invalidate(myShiftProvider);
      if (popAfter && mounted) context.pop();
    } catch (error) {
      if (mounted) setState(() => _error = describeError(context.l10n, error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _withdraw(Mission mission) async {
    final l10n = context.l10n;
    final confirmed = await confirmAction(
      context,
      title: l10n.myMissionsPanelWithdrawConfirm,
      confirmLabel: l10n.myMissionsPanelWithdraw,
      destructive: true,
    );
    if (confirmed) {
      await _run(
        () => ref.read(responderRepositoryProvider).withdrawMission(mission.id),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final repository = ref.read(responderRepositoryProvider);

    final missionState = ref.watch(missionProvider(widget.missionId));
    final mission = missionState.value;
    if (mission == null) {
      // A failed load must not read as "no missions": show why, and let the person retry.
      if (missionState.hasError) {
        return ErrorView(
          message: describeError(l10n, missionState.error!),
          retryLabel: l10n.commonRetry,
          onRetry: () => ref.invalidate(myMissionsProvider),
        );
      }
      return missionState.isLoading
          ? LoadingView(label: l10n.commonLoading)
          : EmptyState(title: l10n.responderMissionsEmpty);
    }

    final incidentState = ref.watch(incidentProvider(mission.incidentId));
    final incident = incidentState.value;
    final unit = ref.watch(unitProvider(mission.unitId)).value;
    final shift = ref.watch(myShiftProvider).value;
    final teammates = ref.watch(
      teammatesProvider((
        missionId: mission.id,
        incidentId: mission.incidentId,
      )),
    );

    // Only the unit's active LEAD may complete; ambulance missions finish
    // through the hospital handoff instead.
    final isLead =
        shift != null && shift.isLead && shift.unitId == mission.unitId;
    final isAmbulance = mission.unitType == UnitType.ambulance;
    final canWithdraw =
        mission.status == MissionStatus.accepted ||
        mission.status == MissionStatus.enRoute;

    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackHeader(
            title: l10n.responderMissionsIncident(mission.incidentId),
            fallbackLocation: '/responder',
          ),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: MissionStatusBadge(status: mission.status),
          ),
          const SizedBox(height: 16),
          if (incident != null) ...[
            _MissionMap(
              mission: mission,
              incident: incident,
              unit: unit,
              teammates: teammates,
            ),
            if (incident.reportedFor == ReportedFor.other) ...[
              ReportedForBadge(reportedFor: incident.reportedFor),
              const SizedBox(height: 16),
            ],
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (incident.address != null) ...[
                    Text(
                      l10n.myMissionDetailReportedAddress,
                      style: TextStyle(fontSize: 12, color: p.textSubtle),
                    ),
                    Text(
                      incident.address!,
                      style: TextStyle(fontSize: 15, color: p.text),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Text(
                    l10n.myMissionDetailReportedInjured(incident.injuredCount),
                    style: TextStyle(fontSize: 15, color: p.text),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            IncidentEvidenceSection(incident: incident, isOwner: false),
            // The server decides who may see the patient's profile (medical
            // crews, while the emergency is open); everyone else gets nothing.
            const SizedBox(height: 12),
            PatientMedicalProfilePanel(incidentId: incident.id),
            const SizedBox(height: 12),
          ] else if (incidentState.hasError) ...[
            // Without the incident there is no map, evidence or hospital handoff: say so instead of hiding them.
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    describeError(l10n, incidentState.error!),
                    style: TextStyle(fontSize: 13, color: p.danger),
                  ),
                  const SizedBox(height: 8),
                  AppButton(
                    label: l10n.commonRetry,
                    variant: AppButtonVariant.secondary,
                    onPressed: () =>
                        ref.invalidate(incidentProvider(mission.incidentId)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          AppCard(
            child: Column(
              children: [
                _InfoRow(
                  label: l10n.responderMissionsUnit,
                  value: mission.unitPlateNumber,
                ),
                _InfoRow(
                  label: l10n.responderMissionsParticipants,
                  value: mission.participantNames.isEmpty
                      ? '—'
                      : mission.participantNames.join(', '),
                ),
              ],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          const SizedBox(height: 16),

          // ---- actions, driven by the mission's status ----
          if (mission.status == MissionStatus.offered && !_rejecting) ...[
            AppButton(
              label: l10n.myMissionsPanelAccept,
              loading: _busy,
              onPressed: () => _run(() => repository.acceptMission(mission.id)),
            ),
            const SizedBox(height: 8),
            AppButton(
              label: l10n.myMissionsPanelReject,
              variant: AppButtonVariant.danger,
              onPressed: _busy ? null : () => setState(() => _rejecting = true),
            ),
          ],
          if (mission.status == MissionStatus.offered && _rejecting) ...[
            AppTextField(
              controller: _reason,
              hintText: l10n.myMissionsPanelReasonPlaceholder,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            AppButton(
              label: _busy
                  ? l10n.responderMissionsRejecting
                  : l10n.myMissionsPanelReject,
              variant: AppButtonVariant.danger,
              loading: _busy,
              onPressed: _reason.text.trim().isEmpty
                  ? null
                  : () => _run(
                      () => repository.rejectMission(
                        mission.id,
                        _reason.text.trim(),
                      ),
                      popAfter: true,
                    ),
            ),
            const SizedBox(height: 8),
            AppButton(
              label: l10n.commonCancel,
              variant: AppButtonVariant.ghost,
              onPressed: _busy
                  ? null
                  : () => setState(() => _rejecting = false),
            ),
          ],
          if (mission.status == MissionStatus.accepted)
            AppButton(
              label: l10n.myMissionsPanelMarkEnRoute,
              loading: _busy,
              onPressed: () => _run(() => repository.markEnRoute(mission.id)),
            ),
          if (mission.status == MissionStatus.enRoute)
            AppButton(
              label: l10n.myMissionsPanelMarkArrived,
              loading: _busy,
              onPressed: () => _run(() => repository.markArrived(mission.id)),
            ),
          if (mission.status == MissionStatus.arrived && isLead && !isAmbulance)
            AppButton(
              label: l10n.myMissionsPanelComplete,
              loading: _busy,
              onPressed: () =>
                  _run(() => repository.completeMission(mission.id)),
            ),
          if (canWithdraw) ...[
            const SizedBox(height: 8),
            AppButton(
              label: l10n.myMissionsPanelWithdraw,
              variant: AppButtonVariant.secondary,
              onPressed: _busy ? null : () => _withdraw(mission),
            ),
          ],
          // Ambulance missions end with the hospital handoff, not "complete".
          if (isAmbulance && incident != null && mission.status.hasHandoff) ...[
            const SizedBox(height: 24),
            HospitalTransferPanel(
              mission: mission,
              incident: incident,
              unit: unit,
            ),
          ],

          if (mission.status != MissionStatus.offered) ...[
            const SizedBox(height: 24),
            IncidentChatPanel(
              incidentId: mission.incidentId,
              readOnly: mission.status.isPast,
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

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
            child: Text(
              label,
              style: TextStyle(fontSize: 13, color: p.textMuted),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(value, style: TextStyle(fontSize: 15, color: p.text)),
          ),
        ],
      ),
    );
  }
}

/// The route map at the top of a mission. Its destination follows the mission: the incident while the unit
/// is travelling there, then -- once an ambulance has chosen a hospital -- the hospital. (It used to vanish
/// on arrival and the hospital route only appeared further down, inside the transfer card.)
class _MissionMap extends ConsumerWidget {
  const _MissionMap({
    required this.mission,
    required this.incident,
    required this.unit,
    required this.teammates,
  });

  final Mission mission;
  final Incident incident;
  final ResponseUnit? unit;
  final List<TeammateUnit> teammates;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transfer = ref.watch(hospitalTransferProvider(mission.id)).value;
    final hospital = transfer?.hospitalId == null
        ? null
        : ref
              .watch(hospitalsProvider)
              .value
              ?.where((h) => h.id == transfer!.hospitalId)
              .firstOrNull;
    final toHospital =
        transfer != null &&
        transfer.status != TransferStatus.arrived &&
        hospital != null;
    // The route starts at THIS phone when it can say where it is; the unit's last reported position is the fallback.
    final own = ref.watch(ownPositionProvider).value;

    // Neither travelling to the incident nor heading to a hospital: nothing useful to draw.
    if (!toHospital && mission.status == MissionStatus.arrived) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: MissionRouteMap(
        unitType: mission.unitType,
        unitLatitude: own?.latitude ?? unit?.latitude,
        unitLongitude: own?.longitude ?? unit?.longitude,
        facilityLatitude: unit?.facilityLatitude,
        facilityLongitude: unit?.facilityLongitude,
        destinationLatitude: toHospital ? hospital.latitude : incident.latitude,
        destinationLongitude: toHospital
            ? hospital.longitude
            : incident.longitude,
        incidentLatitude: toHospital ? incident.latitude : null,
        incidentLongitude: toHospital ? incident.longitude : null,
        teammates: toHospital ? const [] : teammates,
      ),
    );
  }
}
