import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/utils/error_messages.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/consent_text.dart';
import '../../../../core/widgets/pill_select.dart';
import '../../../settings/presentation/widgets/settings_widgets.dart';
import '../../application/medical_providers.dart';
import '../../domain/medical_profile.dart';
import '../medical_labels.dart';
import 'emergency_contacts_editor.dart';
import 'medical_history_section.dart';

/// Create / edit the medical profile. Used on the Account tab and in the
/// one-time onboarding step. Validation matches the web form and the backend:
/// weight 1-500 kg with one decimal, up to three fully filled contacts with
/// valid Egyptian mobile numbers, and "none known" excluding the lists.
class MedicalProfileForm extends ConsumerStatefulWidget {
  const MedicalProfileForm({
    required this.profile,
    required this.onSaved,
    required this.onCancel,
    super.key,
    this.submitLabel,
    this.cancelLabel,
    this.showActions = true,
  });

  final MedicalProfile profile;
  final VoidCallback onSaved;
  final VoidCallback onCancel;
  final String? submitLabel;
  final String? cancelLabel;

  /// Hide the Save / Cancel buttons when the screen supplies its own (e.g. a
  /// bar pinned to the bottom, calling [MedicalProfileFormState.save]).
  final bool showActions;

  @override
  ConsumerState<MedicalProfileForm> createState() => MedicalProfileFormState();
}

class MedicalProfileFormState extends ConsumerState<MedicalProfileForm> {
  late final TextEditingController _weight;
  late final TextEditingController _allergyNotes;
  late final TextEditingController _conditionNotes;
  late final TextEditingController _medications;
  late final TextEditingController _medicalNotes;
  late final List<ContactDraft> _contacts;

  DateTime? _dateOfBirth;
  BloodType? _bloodType;
  bool _noKnownAllergies = false;
  bool _noKnownConditions = false;
  Set<Allergy> _allergies = {};
  Set<MedicalCondition> _conditions = {};
  bool _share = false;

  bool _weightInvalid = false;
  final Map<Key, ContactError> _contactErrors = {};
  bool _saving = false;

  /// Mirrors the saving state for a Save button that lives outside this widget.
  final ValueNotifier<bool> saving = ValueNotifier(false);
  String? _error;

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    _weight = TextEditingController(
      text: p.weightKg == null ? '' : _weightText(p.weightKg!),
    );
    _allergyNotes = TextEditingController(text: p.allergyNotes ?? '');
    _conditionNotes = TextEditingController(text: p.conditionNotes ?? '');
    _medications = TextEditingController(text: p.currentMedications ?? '');
    _medicalNotes = TextEditingController(text: p.medicalNotes ?? '');
    _contacts = p.emergencyContacts.isEmpty
        ? [ContactDraft()]
        : [
            for (final c in p.emergencyContacts)
              ContactDraft(
                name: c.name,
                relationship: c.relationship,
                phone: fromE164EgyptianPhone(c.phone),
              ),
          ];
    _dateOfBirth = p.dateOfBirth;
    _bloodType = p.bloodType;
    _noKnownAllergies = p.noKnownAllergies;
    _noKnownConditions = p.noKnownConditions;
    _allergies = {...p.allergies};
    _conditions = {...p.conditions};
    _share = p.shareWithResponders;
  }

  @override
  void dispose() {
    for (final controller in [
      _weight,
      _allergyNotes,
      _conditionNotes,
      _medications,
      _medicalNotes,
    ]) {
      controller.dispose();
    }
    for (final contact in _contacts) {
      contact.dispose();
    }
    saving.dispose();
    super.dispose();
  }

  static String _weightText(double kg) =>
      kg == kg.roundToDouble() ? kg.toStringAsFixed(0) : kg.toStringAsFixed(1);

  Set<T> _toggled<T>(Set<T> items, T item) =>
      items.contains(item) ? ({...items}..remove(item)) : {...items, item};

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(now.year - 30, now.month, now.day),
      firstDate: DateTime(1900),
      lastDate: now,
    );
    if (picked != null) setState(() => _dateOfBirth = picked);
  }

  /// Validates and saves. Public so a pinned action bar can trigger it.
  Future<void> save() async {
    final l10n = context.l10n;

    // Weight: optional, 1-500 kg. Accept a decimal comma (Arabic keyboards).
    final weightText = _weight.text.trim().replaceAll(',', '.');
    final weight = weightText.isEmpty ? null : double.tryParse(weightText);
    final weightInvalid =
        weightText.isNotEmpty &&
        (weight == null || weight < minWeightKg || weight > maxWeightKg);

    // Contacts: a blank row is ignored; a partly filled one is an error.
    final filled = _contacts.where((c) => !c.isBlank).toList();
    final errors = <Key, ContactError>{};
    for (final contact in filled) {
      if (contact.name.text.trim().isEmpty ||
          contact.relationship == null ||
          contact.phone.isEmpty) {
        errors[contact.key] = ContactError.incomplete;
      } else if (!isValidEgyptianMobile(contact.phone)) {
        errors[contact.key] = ContactError.invalid;
      }
    }

    setState(() {
      _weightInvalid = weightInvalid;
      _contactErrors
        ..clear()
        ..addAll(errors);
      _error = null;
    });
    if (weightInvalid || errors.isNotEmpty) return;

    final profile = MedicalProfile(
      dateOfBirth: _dateOfBirth,
      weightKg: weight,
      bloodType: _bloodType,
      noKnownAllergies: _noKnownAllergies,
      allergies: _noKnownAllergies ? const {} : _allergies,
      allergyNotes: _noKnownAllergies ? null : _allergyNotes.text,
      noKnownConditions: _noKnownConditions,
      conditions: _noKnownConditions ? const {} : _conditions,
      conditionNotes: _noKnownConditions ? null : _conditionNotes.text,
      currentMedications: _medications.text,
      medicalNotes: _medicalNotes.text,
      emergencyContacts: [
        for (final c in filled)
          EmergencyContact(
            name: c.name.text.trim(),
            relationship: c.relationship!,
            phone: toE164EgyptianPhone(c.phone),
          ),
      ],
      shareWithResponders: _share,
    );

    setState(() => _saving = true);
    saving.value = true;
    try {
      await ref.read(medicalProfileProvider.notifier).save(profile);
      if (!mounted) return;
      widget.onSaved();
    } catch (error) {
      if (mounted) {
        setState(() => _error = describeError(l10n, error, byStatus: const {}));
      }
    } finally {
      saving.value = false;
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final locale = Localizations.localeOf(context).toString();

    Widget section(Widget child, {String? title, String? description}) =>
        Padding(
          padding: const EdgeInsets.only(bottom: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (title != null) ...[
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                if (description != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(fontSize: 13, color: p.textMuted),
                  ),
                ],
                const SizedBox(height: 12),
              ],
              child,
            ],
          ),
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        section(
          title: l10n.medicalProfileBasics,
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              PillSelect(
                label: l10n.medicalProfileDateOfBirth,
                icon: Icons.cake_outlined,
                value: _dateOfBirth == null
                    ? null
                    : DateFormat.yMMMd(locale).format(_dateOfBirth!),
                hint: l10n.medicalProfileDobPick,
                onTap: _pickDate,
                onClear: () => setState(() => _dateOfBirth = null),
              ),
              const SizedBox(height: 14),
              AppTextField(
                label: l10n.medicalProfileWeight,
                controller: _weight,
                hintText: l10n.medicalProfileKg,
                prefixIcon: Icons.monitor_weight_outlined,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                errorText: _weightInvalid
                    ? l10n.medicalProfileWeightInvalid(minWeightKg, maxWeightKg)
                    : null,
                onChanged: (_) {
                  if (_weightInvalid) setState(() => _weightInvalid = false);
                },
              ),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsetsDirectional.only(start: 4),
                child: Text(
                  l10n.medicalProfileBloodType,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final type in BloodType.values)
                    ChoiceChip(
                      label: Text(bloodTypeLabel(type)),
                      selected: _bloodType == type,
                      // Tapping the chosen one clears it ("not specified").
                      onSelected: (_) => setState(
                        () => _bloodType = _bloodType == type ? null : type,
                      ),
                      showCheckmark: false,
                      selectedColor: p.primary,
                      backgroundColor: p.surface,
                      side: BorderSide(
                        color: _bloodType == type ? p.primary : p.border,
                      ),
                      labelStyle: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: _bloodType == type ? Colors.white : p.text,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        section(
          MedicalHistorySection<Allergy>(
            legend: l10n.medicalProfileAllergies,
            noneLabel: l10n.medicalProfileNoKnownAllergies,
            noneChecked: _noKnownAllergies,
            onNoneChanged: (checked) => setState(() {
              _noKnownAllergies = checked;
              if (checked) {
                _allergies = {};
                _allergyNotes.clear();
              }
            }),
            options: Allergy.values,
            selected: _allergies,
            labelOf: (a) => allergyLabel(l10n, a),
            onToggle: (a) =>
                setState(() => _allergies = _toggled(_allergies, a)),
            notesLabel: l10n.medicalProfileAllergyNotesLabel,
            notesHint: l10n.medicalProfileAllergyNotesPlaceholder,
            notesController: _allergyNotes,
          ),
        ),
        section(
          MedicalHistorySection<MedicalCondition>(
            legend: l10n.medicalProfileConditions,
            noneLabel: l10n.medicalProfileNoKnownConditions,
            noneChecked: _noKnownConditions,
            onNoneChanged: (checked) => setState(() {
              _noKnownConditions = checked;
              if (checked) {
                _conditions = {};
                _conditionNotes.clear();
              }
            }),
            options: MedicalCondition.values,
            selected: _conditions,
            labelOf: (c) => conditionLabel(l10n, c),
            onToggle: (c) =>
                setState(() => _conditions = _toggled(_conditions, c)),
            notesLabel: l10n.medicalProfileConditionNotesLabel,
            notesHint: l10n.medicalProfileConditionNotesPlaceholder,
            notesController: _conditionNotes,
          ),
        ),
        section(
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppTextField(
                label: l10n.medicalProfileMedications,
                controller: _medications,
                hintText: l10n.medicalProfileMedicationsPlaceholder,
                minLines: 2,
                maxLines: 4,
                maxLength: maxNotesLength,
                textCapitalization: TextCapitalization.sentences,
              ),
              const SizedBox(height: 14),
              AppTextField(
                label: l10n.medicalProfileMedicalNotes,
                controller: _medicalNotes,
                hintText: l10n.medicalProfileMedicalNotesPlaceholder,
                minLines: 2,
                maxLines: 4,
                maxLength: maxNotesLength,
                textCapitalization: TextCapitalization.sentences,
              ),
            ],
          ),
        ),
        section(
          title: l10n.medicalProfileEmergencyContacts,
          description: l10n.medicalProfileEmergencyContactsHint(
            maxEmergencyContacts,
          ),
          EmergencyContactsEditor(
            contacts: _contacts,
            errors: _contactErrors,
            onAdd: () => setState(() => _contacts.add(ContactDraft())),
            onRemove: (contact) => setState(() {
              _contacts.remove(contact);
              _contactErrors.remove(contact.key);
              contact.dispose();
            }),
            onChanged: (contact) {
              // Editing a row clears its error; rebuild so the red outline goes.
              if (_contactErrors.remove(contact.key) != null) setState(() {});
            },
          ),
        ),
        section(
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: p.border),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.medicalProfileSharingLabel,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      ConsentText(
                        template: l10n.medicalProfileSharingDescription,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                SettingsSwitch(
                  value: _share,
                  onChanged: (value) => setState(() => _share = value),
                ),
              ],
            ),
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              _error!,
              style: TextStyle(fontSize: 14, color: p.danger),
            ),
          ),
        if (widget.showActions) ...[
          AppButton(
            label: _saving
                ? l10n.medicalProfileSaving
                : (widget.submitLabel ?? l10n.commonSave),
            loading: _saving,
            onPressed: save,
          ),
          const SizedBox(height: 8),
          AppButton(
            label: widget.cancelLabel ?? l10n.commonCancel,
            variant: AppButtonVariant.ghost,
            onPressed: _saving ? null : widget.onCancel,
          ),
        ],
      ],
    );
  }
}
