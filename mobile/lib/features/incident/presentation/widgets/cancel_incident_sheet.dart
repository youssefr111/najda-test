import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/enum_labels.dart';
import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/utils/error_messages.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../application/incident_providers.dart';
import '../../data/incident_repository.dart';
import '../../domain/incident.dart';

/// Opens the cancel flow. Resolves to `true` when the report was cancelled.
Future<bool> showCancelIncidentSheet(
  BuildContext context,
  Incident incident,
) async {
  final p = context.palette;
  final cancelled = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: p.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (_) => _CancelIncidentSheet(incident: incident),
  );
  return cancelled ?? false;
}

/// Pick why (details are required for "other"), with a warning when a unit is
/// already on its way. The backend refuses once a unit has arrived, so the
/// screen does not offer this at all in that case.
class _CancelIncidentSheet extends ConsumerStatefulWidget {
  const _CancelIncidentSheet({required this.incident});

  final Incident incident;

  @override
  ConsumerState<_CancelIncidentSheet> createState() =>
      _CancelIncidentSheetState();
}

class _CancelIncidentSheetState extends ConsumerState<_CancelIncidentSheet> {
  static const _maxDetailsLength = 255;

  final _details = TextEditingController();
  CancellationCategory? _category;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  bool get _canSubmit {
    final category = _category;
    if (category == null || _submitting) return false;
    return !category.needsDetails || _details.text.trim().isNotEmpty;
  }

  Future<void> _submit() async {
    final category = _category;
    if (category == null) return;

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final details = _details.text.trim();
      await ref
          .read(incidentRepositoryProvider)
          .cancel(
            widget.incident.id,
            category: category,
            details: details.isEmpty ? null : details,
          );
      ref
        ..invalidate(incidentProvider(widget.incident.id))
        ..invalidate(myIncidentsProvider);
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) setState(() => _error = describeError(context.l10n, error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Padding(
      // Lifts the sheet above the keyboard.
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.cancelTitle,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              l10n.cancelWhy,
              style: TextStyle(fontSize: 14, color: p.textMuted),
            ),
            if (widget.incident.status.cancelNeedsReason) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: p.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      size: 20,
                      color: p.warning,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        l10n.cancelIncidentUnitOnTheWay,
                        style: TextStyle(fontSize: 13, color: p.text),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final option in CancellationCategory.values)
                  ChoiceChip(
                    label: Text(cancellationCategoryLabel(l10n, option)),
                    selected: _category == option,
                    onSelected: _submitting
                        ? null
                        : (_) => setState(() => _category = option),
                    showCheckmark: false,
                    selectedColor: p.primary,
                    backgroundColor: p.surface,
                    side: BorderSide(
                      color: _category == option ? p.primary : p.border,
                    ),
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: _category == option ? Colors.white : p.text,
                    ),
                  ),
              ],
            ),
            if (_category != null) ...[
              const SizedBox(height: 16),
              AppTextField(
                controller: _details,
                hintText: _category!.needsDetails
                    ? l10n.cancelIncidentDetailsRequired
                    : l10n.cancelIncidentDetailsOptional,
                maxLength: _maxDetailsLength,
                minLines: 2,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => setState(() {}),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
            ],
            const SizedBox(height: 20),
            AppButton(
              label: _submitting
                  ? l10n.cancelIncidentCancelling
                  : l10n.confirmCancel,
              variant: AppButtonVariant.danger,
              loading: _submitting,
              onPressed: _canSubmit ? _submit : null,
            ),
            const SizedBox(height: 8),
            AppButton(
              label: l10n.keepReport,
              variant: AppButtonVariant.secondary,
              onPressed: _submitting
                  ? null
                  : () => Navigator.of(context).pop(false),
            ),
          ],
        ),
      ),
    );
  }
}
