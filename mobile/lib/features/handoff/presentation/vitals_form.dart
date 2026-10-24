import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/section_label.dart';
import '../application/handoff_providers.dart';
import '../data/hospital_transfer_repository.dart';
import '../domain/hospital_transfer.dart';

/// Send a vitals reading while the ambulance is en route. Every number is
/// optional; blank fields are simply not sent.
class VitalsForm extends ConsumerStatefulWidget {
  const VitalsForm({required this.transferId, super.key});

  final int transferId;

  @override
  ConsumerState<VitalsForm> createState() => _VitalsFormState();
}

class _VitalsFormState extends ConsumerState<VitalsForm> {
  static const _columnGap = 10.0;

  final _heartRate = TextEditingController();
  final _systolic = TextEditingController();
  final _diastolic = TextEditingController();
  final _spo2 = TextEditingController();
  final _respiratoryRate = TextEditingController();
  final _temperature = TextEditingController();
  final _notes = TextEditingController();

  ConsciousnessLevel _consciousness = ConsciousnessLevel.alert;
  bool _sending = false;
  bool _failed = false;

  @override
  void dispose() {
    for (final controller in [
      _heartRate,
      _systolic,
      _diastolic,
      _spo2,
      _respiratoryRate,
      _temperature,
      _notes,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  int? _int(TextEditingController c) => int.tryParse(c.text.trim());

  Future<void> _submit() async {
    setState(() {
      _sending = true;
      _failed = false;
    });
    try {
      final notes = _notes.text.trim();
      await ref
          .read(hospitalTransferRepositoryProvider)
          .sendVitals(
            VitalsInput(
              hospitalTransferId: widget.transferId,
              consciousnessLevel: _consciousness,
              heartRate: _int(_heartRate),
              bloodPressureSystolic: _int(_systolic),
              bloodPressureDiastolic: _int(_diastolic),
              spo2: _int(_spo2),
              respiratoryRate: _int(_respiratoryRate),
              temperatureCelsius: double.tryParse(
                _temperature.text.trim().replaceAll(',', '.'),
              ),
              notes: notes.isEmpty ? null : notes,
            ),
          );
      ref.invalidate(vitalsHistoryProvider(widget.transferId));
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final digits = [
      FilteringTextInputFormatter.digitsOnly,
      LengthLimitingTextInputFormatter(3),
    ];

    final fields = [
      AppTextField(
        label: l10n.hospitalTransferPanelHeartRate,
        controller: _heartRate,
        keyboardType: TextInputType.number,
        inputFormatters: digits,
      ),
      AppTextField(
        label: l10n.hospitalTransferPanelBpSystolic,
        controller: _systolic,
        keyboardType: TextInputType.number,
        inputFormatters: digits,
      ),
      AppTextField(
        label: l10n.hospitalTransferPanelBpDiastolic,
        controller: _diastolic,
        keyboardType: TextInputType.number,
        inputFormatters: digits,
      ),
      AppTextField(
        label: l10n.hospitalTransferPanelSpo2,
        controller: _spo2,
        keyboardType: TextInputType.number,
        inputFormatters: digits,
      ),
      AppTextField(
        label: l10n.hospitalTransferPanelRespRate,
        controller: _respiratoryRate,
        keyboardType: TextInputType.number,
        inputFormatters: digits,
      ),
      AppTextField(
        label: l10n.hospitalTransferPanelTemp,
        controller: _temperature,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [
          FilteringTextInputFormatter.allow(RegExp('[0-9.,]')),
          LengthLimitingTextInputFormatter(5),
        ],
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Two equal columns that always fit, however narrow the screen.
        LayoutBuilder(
          builder: (context, constraints) {
            final width = (constraints.maxWidth - _columnGap) / 2;
            return Wrap(
              spacing: _columnGap,
              runSpacing: 12,
              children: [
                for (final field in fields)
                  SizedBox(width: width, child: field),
              ],
            );
          },
        ),
        const SizedBox(height: 16),
        SectionLabel(l10n.hospitalTransferPanelConsciousness),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final level in ConsciousnessLevel.values)
              ChoiceChip(
                label: Text(consciousnessLabel(l10n, level)),
                selected: _consciousness == level,
                onSelected: (_) => setState(() => _consciousness = level),
              ),
          ],
        ),
        const SizedBox(height: 12),
        AppTextField(
          controller: _notes,
          hintText: l10n.hospitalTransferPanelNotesPlaceholder,
          minLines: 2,
          maxLines: 4,
          textCapitalization: TextCapitalization.sentences,
        ),
        if (_failed) ...[
          const SizedBox(height: 8),
          Text(
            l10n.hospitalTransferPanelVitalsError,
            style: TextStyle(fontSize: 13, color: p.danger),
          ),
        ],
        const SizedBox(height: 12),
        AppButton(
          label: _sending
              ? l10n.hospitalTransferPanelSendingVitals
              : l10n.hospitalTransferPanelSendVitals,
          loading: _sending,
          onPressed: _submit,
        ),
      ],
    );
  }
}
