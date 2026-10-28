import '../../../core/location/own_position.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_badge.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/section_label.dart';
import '../../incident/domain/incident.dart';
import '../../map/hospital_selection_map.dart';
import '../../map/mission_route_map.dart';
import '../../responder/application/responder_providers.dart';
import '../../responder/domain/mission.dart';
import '../../responder/domain/unit.dart';
import '../application/handoff_providers.dart';
import '../data/hospital_transfer_repository.dart';
import '../domain/hospital_transfer.dart';
import 'vitals_form.dart';

/// The ambulance crew's end-of-mission flow: choose a hospital (map or list),
/// drive there, send vitals, and mark arrival -- which resolves the mission.
class HospitalTransferPanel extends ConsumerWidget {
  const HospitalTransferPanel({
    required this.mission,
    required this.incident,
    required this.unit,
    super.key,
  });

  final Mission mission;
  final Incident incident;
  final ResponseUnit? unit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final transfer = ref.watch(hospitalTransferProvider(mission.id));

    return switch (transfer) {
      AsyncData(value: final HospitalTransfer current) =>
        _TransferProgress(transfer: current, mission: mission, incident: incident, unit: unit),
      // A finished mission without a transfer has nothing left to choose.
      AsyncData() when mission.status != MissionStatus.arrived => const SizedBox.shrink(),
      AsyncData() => _HospitalSelection(mission: mission, incident: incident, unit: unit),
      AsyncError(:final error) =>
        Text(describeError(l10n, error), style: TextStyle(fontSize: 13, color: p.danger)),
      _ => Text(l10n.hospitalTransferPanelLoading, style: TextStyle(fontSize: 13, color: p.textMuted)),
    };
  }
}

class _HospitalSelection extends ConsumerStatefulWidget {
  const _HospitalSelection({required this.mission, required this.incident, required this.unit});

  final Mission mission;
  final Incident incident;
  final ResponseUnit? unit;

  @override
  ConsumerState<_HospitalSelection> createState() => _HospitalSelectionState();
}

class _HospitalSelectionState extends ConsumerState<_HospitalSelection> {
  final _search = TextEditingController();
  final _freetext = TextEditingController();

  int? _pendingId;
  bool _customDestination = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _search.dispose();
    _freetext.dispose();
    super.dispose();
  }

  Future<void> _select({int? hospitalId, String? destination}) async {
    final l10n = context.l10n;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(hospitalTransferRepositoryProvider).select(
            missionId: widget.mission.id,
            hospitalId: hospitalId,
            destinationNameFreetext: destination,
          );
      ref.invalidate(hospitalTransferProvider(widget.mission.id));
    } catch (_) {
      if (mounted) setState(() => _error = l10n.hospitalTransferPanelSelectError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    final options = ref.watch(
      hospitalOptionsProvider(
        (
          missionId: widget.mission.id,
          incidentLat: widget.incident.latitude,
          incidentLng: widget.incident.longitude,
          ownFacilityId: widget.unit?.facilityId,
        ),
      ),
    );

    final all = options.value ?? const <HospitalOption>[];
    final query = _search.text.trim().toLowerCase();
    final visible = query.isEmpty ? all : all.where((o) => o.name.toLowerCase().contains(query)).toList();
    final pending = all.where((o) => o.id == _pendingId).firstOrNull;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.hospitalTransferPanelSelectDestination,
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: p.text),
        ),
        const SizedBox(height: 12),
        if (all.isNotEmpty) ...[
          HospitalSelectionMap(
            // Your base is always drawn, even when it is a station rather than a hospital.
            baseLatitude: widget.unit?.facilityLatitude,
            baseLongitude: widget.unit?.facilityLongitude,
            incidentLatitude: widget.incident.latitude,
            incidentLongitude: widget.incident.longitude,
            options: all,
            selectedId: _pendingId,
            onSelect: (id) => setState(() {
              _pendingId = id;
              _customDestination = false;
            }),
          ),
          const SizedBox(height: 12),
        ],
        if (pending != null) ...[
          AppCard(
            color: p.surfaceAlt,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  pending.name,
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: p.text),
                ),
                const SizedBox(height: 12),
                AppButton(
                  label: l10n.hospitalTransferPanelConfirmSelection,
                  loading: _busy,
                  onPressed: () => _select(hospitalId: pending.id),
                ),
                const SizedBox(height: 8),
                AppButton(
                  label: l10n.commonCancel,
                  variant: AppButtonVariant.ghost,
                  onPressed: _busy ? null : () => setState(() => _pendingId = null),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        AppTextField(
          controller: _search,
          hintText: l10n.hospitalTransferPanelSearchPlaceholder,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 8),
        if (options.isLoading && all.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator(color: p.primary)),
          )
        else if (visible.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              l10n.hospitalTransferPanelNoHospitalsMatch,
              style: TextStyle(fontSize: 13, color: p.textMuted),
            ),
          )
        else
          // A bounded list so a long hospital directory never pushes the rest
          // of the screen away.
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 280),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: visible.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) => _HospitalTile(
                option: visible[index],
                selected: visible[index].id == _pendingId,
                onTap: () => setState(() {
                  _pendingId = visible[index].id;
                  _customDestination = false;
                }),
              ),
            ),
          ),
        const SizedBox(height: 12),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: TextButton(
            onPressed: () => setState(() {
              _customDestination = !_customDestination;
              if (_customDestination) _pendingId = null;
            }),
            child: Text(l10n.hospitalTransferPanelStillNotThere),
          ),
        ),
        if (_customDestination) ...[
          AppTextField(
            controller: _freetext,
            hintText: l10n.hospitalTransferPanelHospitalNamePlaceholder,
            textCapitalization: TextCapitalization.words,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 8),
          AppButton(
            label: l10n.hospitalTransferPanelConfirmSelection,
            loading: _busy,
            onPressed:
                _freetext.text.trim().isEmpty ? null : () => _select(destination: _freetext.text.trim()),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
        ],
      ],
    );
  }
}

class _HospitalTile extends StatelessWidget {
  const _HospitalTile({required this.option, required this.selected, required this.onTap});

  final HospitalOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? p.surfaceAlt : p.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? p.primary : p.border, width: selected ? 1.5 : 1),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    option.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: p.text),
                  ),
                  if (option.recommended || option.isOwnBase) ...[
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        if (option.recommended)
                          AppBadge(label: l10n.hospitalLabelsRecommended, tone: BadgeTone.success),
                        if (option.isOwnBase)
                          AppBadge(label: l10n.hospitalLabelsYourBase, tone: BadgeTone.info),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            if (option.distanceKm != null) ...[
              const SizedBox(width: 12),
              Text(
                '${option.distanceKm!.toStringAsFixed(1)} km',
                textDirection: TextDirection.ltr,
                style: TextStyle(fontSize: 13, color: p.textMuted),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TransferProgress extends ConsumerStatefulWidget {
  const _TransferProgress({
    required this.transfer,
    required this.mission,
    required this.incident,
    required this.unit,
  });

  final HospitalTransfer transfer;
  final Mission mission;
  final Incident incident;
  final ResponseUnit? unit;

  @override
  ConsumerState<_TransferProgress> createState() => _TransferProgressState();
}

class _TransferProgressState extends ConsumerState<_TransferProgress> {
  bool _busy = false;
  String? _error;

  Future<void> _advance(Future<HospitalTransfer> Function(HospitalTransferRepository) action) async {
    final l10n = context.l10n;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action(ref.read(hospitalTransferRepositoryProvider));
      ref
        ..invalidate(hospitalTransferProvider(widget.mission.id))
        // Arriving resolves the mission and frees the unit.
        ..invalidate(myMissionsProvider)
        ..invalidate(myShiftProvider);
    } catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final transfer = widget.transfer;

    final hospital = transfer.hospitalId == null
        ? null
        : ref
            .watch(hospitalsProvider)
            .value
            ?.where((h) => h.id == transfer.hospitalId)
            .firstOrNull;

    final statusTone = switch (transfer.status) {
      TransferStatus.selected => BadgeTone.info,
      TransferStatus.enRoute => BadgeTone.warning,
      TransferStatus.arrived => BadgeTone.success,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Row(
            children: [
              Expanded(
                child: Text(
                  transfer.destinationName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: p.text),
                ),
              ),
              const SizedBox(width: 8),
              AppBadge(label: transferStatusLabel(l10n, transfer.status), tone: statusTone),
            ],
          ),
        ),
        if (hospital != null && transfer.status != TransferStatus.arrived) ...[
          const SizedBox(height: 12),
          MissionRouteMap(
            unitType: widget.unit?.unitType,
            unitLatitude: ref.watch(ownPositionProvider).value?.latitude ?? widget.unit?.latitude,
            unitLongitude: ref.watch(ownPositionProvider).value?.longitude ?? widget.unit?.longitude,
            facilityLatitude: widget.unit?.facilityLatitude,
            facilityLongitude: widget.unit?.facilityLongitude,
            destinationLatitude: hospital.latitude,
            destinationLongitude: hospital.longitude,
            // Heading to a hospital: the incident is shown as a reference pin.
            incidentLatitude: widget.incident.latitude,
            incidentLongitude: widget.incident.longitude,
          ),
        ],
        const SizedBox(height: 12),
        switch (transfer.status) {
          TransferStatus.selected => AppButton(
              label: l10n.hospitalTransferPanelMarkEnRoute,
              loading: _busy,
              onPressed: () => _advance((r) => r.markEnRoute(transfer.id)),
            ),
          TransferStatus.enRoute => AppButton(
              label: l10n.hospitalTransferPanelMarkArrived,
              loading: _busy,
              onPressed: () => _advance((r) => r.markArrived(transfer.id)),
            ),
          TransferStatus.arrived => Text(
              l10n.hospitalTransferPanelTransferComplete,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: p.success),
            ),
        },
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
        ],
        if (transfer.status == TransferStatus.enRoute) ...[
          const SizedBox(height: 20),
          SectionLabel(l10n.hospitalTransferPanelSendVitals),
          const SizedBox(height: 8),
          VitalsForm(transferId: transfer.id),
        ],
      ],
    );
  }
}