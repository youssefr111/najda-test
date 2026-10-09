import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../../core/widgets/section_label.dart';
import '../../../core/widgets/states.dart';
import '../application/responder_providers.dart';
import '../data/responder_repository.dart';
import '../domain/shift.dart';
import '../domain/unit.dart';

class ShiftScreen extends ConsumerStatefulWidget {
  const ShiftScreen({super.key});

  @override
  ConsumerState<ShiftScreen> createState() => _ShiftScreenState();
}

class _ShiftScreenState extends ConsumerState<ShiftScreen> {
  int? _selectedUnitId;
  bool _busy = false;
  bool _sharingPaused = false;
  String? _error;

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      ref.invalidate(myShiftProvider);
      ref.invalidate(myMissionsProvider);
      ref.invalidate(myFacilityUnitsProvider);
      if (mounted) setState(() => _sharingPaused = false);
    } catch (error) {
      if (mounted) setState(() => _error = describeError(context.l10n, error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmThen(String title, Future<void> Function() action, {bool destructive = false}) async {
    final confirmed = await confirmAction(
      context,
      title: title,
      confirmLabel: context.l10n.commonConfirm,
      destructive: destructive,
    );
    if (confirmed) await _run(action);
  }

  Future<void> _resetLocation(int unitId) async {
    final l10n = context.l10n;
    final confirmed = await confirmAction(
      context,
      title: l10n.shiftStatusCardResetConfirm,
      confirmLabel: l10n.commonConfirm,
    );
    if (!confirmed) return;

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(responderRepositoryProvider).resetLocation(unitId);
      // Matches the web: resetting parks the unit at its facility and pauses
      // sharing so the next GPS fix does not immediately move it again.
      if (mounted) setState(() => _sharingPaused = true);
      ref.invalidate(unitProvider(unitId));
    } catch (_) {
      if (mounted) setState(() => _error = l10n.shiftStatusCardResetError);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final shift = ref.watch(myShiftProvider);
    final units = ref.watch(myFacilityUnitsProvider);

    if (shift.isLoading && !shift.hasValue || units.isLoading && !units.hasValue) {
      return LoadingView(label: l10n.commonLoading);
    }
    if (shift.hasError && !shift.hasValue) {
      return ErrorView(
        message: describeError(l10n, shift.error!),
        retryLabel: l10n.commonRetry,
        onRetry: () => ref.invalidate(myShiftProvider),
      );
    }

    final current = shift.valueOrNull;
    return current != null ? _onShift(context, current) : _offShift(context, units.valueOrNull ?? const []);
  }

  Widget _onShift(BuildContext context, ShiftAssignment shift) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();

    // Watching the provider is what keeps the GPS stream alive; pausing simply
    // stops watching it, which disposes the stream.
    final sharing = _sharingPaused
        ? null
        : ref.watch(unitLocationSharingProvider(shift.unitId)).valueOrNull;

    final (statusColor, statusText) = switch (sharing?.status) {
      null => (AppColors.amber500, l10n.shiftStatusCardLocationPaused),
      LocationSharingStatus.idle => (AppColors.amber500, l10n.shiftStatusCardWaitingGps),
      LocationSharingStatus.watching => (
          AppColors.emerald500,
          sharing!.lastUpdatedAt == null
              ? l10n.responderShiftLocationWatching
              : l10n.shiftStatusCardLive(DateFormat.jms(locale).format(sharing.lastUpdatedAt!)),
        ),
      LocationSharingStatus.denied => (AppColors.amber500, l10n.responderShiftLocationDenied),
      LocationSharingStatus.error => (AppColors.amber500, l10n.responderShiftLocationError),
    };

    final crew = ref.watch(crewForUnitProvider(shift.unitId)).valueOrNull ?? const [];

    return ScreenScaffold(
      scroll: true,
      onRefresh: () async => ref.invalidate(myShiftProvider),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 8),
          Text(
            l10n.responderShiftTitle,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: p.text),
          ),
          const SizedBox(height: 16),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.responderShiftOnShiftAs(roleInShiftLabel(l10n, shift.roleInShift)),
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: p.text),
                ),
                const SizedBox(height: 12),
                _Line(label: l10n.responderShiftUnit, value: shift.unitPlateNumber),
                _Line(
                  label: l10n.responderShiftStartedAt,
                  value: DateFormat.jm(locale).format(shift.startTime),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      height: 8,
                      width: 8,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: statusColor),
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(statusText, style: TextStyle(fontSize: 13, color: p.textMuted))),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: AppButton(
                        label: _sharingPaused ? l10n.shiftStatusCardResume : l10n.shiftStatusCardPause,
                        variant: AppButtonVariant.secondary,
                        onPressed: () => setState(() => _sharingPaused = !_sharingPaused),
                      ),
                    ),
                    if (shift.isLead) ...[
                      const SizedBox(width: 8),
                      Expanded(
                        child: AppButton(
                          label: l10n.shiftStatusCardResetToFacility,
                          variant: AppButtonVariant.secondary,
                          onPressed: _busy ? null : () => _resetLocation(shift.unitId),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          if (crew.isNotEmpty) ...[
            const SizedBox(height: 16),
            SectionLabel(l10n.responderShiftYourCrew),
            const SizedBox(height: 8),
            for (final member in crew)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  '${member.employeeName} · ${roleInShiftLabel(l10n, member.roleInShift)}',
                  style: TextStyle(fontSize: 14, color: p.text),
                ),
              ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          const SizedBox(height: 24),
          AppButton(
            label: l10n.responderShiftLeaveShift,
            variant: AppButtonVariant.secondary,
            loading: _busy,
            onPressed: () => _confirmThen(
              l10n.responderShiftLeaveConfirm,
              ref.read(responderRepositoryProvider).leaveShift,
            ),
          ),
          if (shift.isLead) ...[
            const SizedBox(height: 8),
            AppButton(
              label: l10n.responderShiftEndShift,
              variant: AppButtonVariant.danger,
              loading: _busy,
              onPressed: () => _confirmThen(
                l10n.responderShiftEndConfirm,
                ref.read(responderRepositoryProvider).endShift,
                destructive: true,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _offShift(BuildContext context, List<ResponseUnit> allUnits) {
    final l10n = context.l10n;
    final p = context.palette;
    final repository = ref.read(responderRepositoryProvider);
    final units = allUnits.where((u) => u.status != UnitStatus.maintenance).toList();
    final selected = _selectedUnitId;

    return ScreenScaffold(
      scroll: true,
      onRefresh: () async => ref.invalidate(myFacilityUnitsProvider),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 8),
          Text(
            l10n.responderShiftNotOnShift,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: p.text),
          ),
          const SizedBox(height: 4),
          Text(l10n.responderShiftNotOnShiftBody, style: TextStyle(fontSize: 15, color: p.textMuted)),
          const SizedBox(height: 20),
          if (units.isEmpty)
            Text(l10n.shiftStatusCardNoUnitsAtFacility, style: TextStyle(fontSize: 14, color: p.textMuted))
          else ...[
            SectionLabel(l10n.responderShiftSelectUnit),
            const SizedBox(height: 8),
            for (final unit in units)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => setState(() => _selectedUnitId = unit.id),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: selected == unit.id ? p.surfaceAlt : p.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: selected == unit.id ? AppColors.blue600 : p.border,
                        width: 1.5,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${unit.displayName} · ${unitTypeLabel(l10n, unit.unitType)}',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: p.text),
                        ),
                        if (unit.currentLeadName != null)
                          Text(
                            l10n.shiftStatusCardLedBy(unit.currentLeadName!),
                            style: TextStyle(fontSize: 12, color: p.textMuted),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          const SizedBox(height: 16),
          AppButton(
            label: l10n.responderShiftStartShift,
            loading: _busy,
            onPressed: selected == null ? null : () => _run(() => repository.startShift(selected)),
          ),
          const SizedBox(height: 8),
          AppButton(
            label: l10n.responderShiftJoinShift,
            variant: AppButtonVariant.secondary,
            onPressed: selected == null || _busy ? null : () => _run(() => repository.joinShift(selected)),
          ),
        ],
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(fontSize: 13, color: p.textMuted))),
          Text(value, style: TextStyle(fontSize: 15, color: p.text)),
        ],
      ),
    );
  }
}
