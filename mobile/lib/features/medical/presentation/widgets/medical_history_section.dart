import 'package:flutter/material.dart';

import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../domain/medical_profile.dart';
import '../../../settings/presentation/widgets/settings_widgets.dart';

/// Quick-pick chips plus a free-text "other" box, with an explicit "none known"
/// switch. "None known" matters: an empty list alone only says nothing was
/// provided, which is not the same as "I have no allergies".
class MedicalHistorySection<T> extends StatelessWidget {
  const MedicalHistorySection({
    required this.legend,
    required this.noneLabel,
    required this.noneChecked,
    required this.onNoneChanged,
    required this.options,
    required this.selected,
    required this.labelOf,
    required this.onToggle,
    required this.notesLabel,
    required this.notesHint,
    required this.notesController,
    super.key,
  });

  final String legend;
  final String noneLabel;
  final bool noneChecked;
  final ValueChanged<bool> onNoneChanged;
  final List<T> options;
  final Set<T> selected;
  final String Function(T option) labelOf;
  final ValueChanged<T> onToggle;
  final String notesLabel;
  final String notesHint;
  final TextEditingController notesController;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                legend,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: Text(
                noneLabel,
                style: TextStyle(fontSize: 14, color: p.textMuted),
              ),
            ),
            SettingsSwitch(value: noneChecked, onChanged: onNoneChanged),
          ],
        ),
        const SizedBox(height: 8),
        // Everything below is inert while "none known" is on.
        IgnorePointer(
          ignoring: noneChecked,
          child: AnimatedOpacity(
            duration: const Duration(milliseconds: 150),
            opacity: noneChecked ? 0.45 : 1,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final option in options)
                      FilterChip(
                        label: Text(labelOf(option)),
                        selected: selected.contains(option),
                        onSelected: (_) => onToggle(option),
                        showCheckmark: false,
                        selectedColor: p.primary,
                        backgroundColor: p.surface,
                        side: BorderSide(
                          color: selected.contains(option)
                              ? p.primary
                              : p.border,
                        ),
                        labelStyle: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: selected.contains(option)
                              ? Colors.white
                              : p.text,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                AppTextField(
                  label: notesLabel,
                  controller: notesController,
                  hintText: notesHint,
                  minLines: 1,
                  maxLines: 3,
                  maxLength: maxNotesLength,
                  textCapitalization: TextCapitalization.sentences,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
