import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/enum_labels.dart';
import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/utils/error_messages.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../application/incident_providers.dart';
import '../../data/incident_repository.dart';
import '../../domain/incident.dart';

/// Cancel flow: pick a reason category (details required for "other"), with a
/// warning when a unit is already on its way.
class CancelIncidentSection extends ConsumerStatefulWidget {
  const CancelIncidentSection({required this.incident, super.key});

  final Incident incident;

  @override
  ConsumerState<CancelIncidentSection> createState() => _CancelIncidentSectionState();
}

class _CancelIncidentSectionState extends ConsumerState<CancelIncidentSection> {
  static const _maxDetailsLength = 255;

  final _details = TextEditingController();

  bool _open = false;
  bool _submitting = false;
  CancellationCategory? _category;
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

  void _close() => setState(() {
        _open = false;
        _category = null;
        _error = null;
        _details.clear();
      });

  Future<void> _submit() async {
    final category = _category;
    if (category == null) return;

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final details = _details.text.trim();
      await ref.read(incidentRepositoryProvider).cancel(
            widget.incident.id,
            category: category,
            details: details.isEmpty ? null : details,
          );
      ref.invalidate(incidentProvider(widget.incident.id));
      ref.invalidate(myIncidentsProvider);
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

    if (!_open) {
      return AppButton(
        label: l10n.cancelIncidentOpen,
        variant: AppButtonVariant.danger,
        onPressed: () => setState(() => _open = true),
      );
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.cancelIncidentTitle,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: p.text),
          ),
          if (widget.incident.status.cancelNeedsReason) ...[
            const SizedBox(height: 8),
            Text(l10n.cancelIncidentUnitOnTheWay, style: TextStyle(fontSize: 13, color: p.warning)),
          ],
          const SizedBox(height: 12),
          Text(l10n.cancelIncidentReasonPrompt, style: TextStyle(fontSize: 14, color: p.textMuted)),
          RadioGroup<CancellationCategory>(
            groupValue: _category,
            onChanged: (value) => setState(() => _category = value),
            child: Column(
              children: [
                for (final option in CancellationCategory.values)
                  RadioListTile<CancellationCategory>(
                    value: option,
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      cancellationCategoryLabel(l10n, option),
                      style: TextStyle(fontSize: 14, color: p.text),
                    ),
                  ),
              ],
            ),
          ),
          if (_category != null) ...[
            const SizedBox(height: 8),
            AppTextField(
              controller: _details,
              hintText: _category!.needsDetails
                  ? l10n.cancelIncidentDetailsRequired
                  : l10n.cancelIncidentDetailsOptional,
              maxLength: _maxDetailsLength,
              minLines: 2,
              maxLines: 4,
              onChanged: (_) => setState(() {}),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          const SizedBox(height: 16),
          AppButton(
            label: _submitting ? l10n.cancelIncidentCancelling : l10n.cancelIncidentConfirm,
            variant: AppButtonVariant.danger,
            loading: _submitting,
            onPressed: _canSubmit ? _submit : null,
          ),
          const SizedBox(height: 8),
          AppButton(
            label: l10n.cancelIncidentKeep,
            variant: AppButtonVariant.secondary,
            onPressed: _submitting ? null : _close,
          ),
        ],
      ),
    );
  }
}
