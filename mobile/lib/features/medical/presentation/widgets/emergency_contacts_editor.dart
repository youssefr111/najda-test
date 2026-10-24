import 'package:flutter/material.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/pill_select.dart';
import '../../../auth/presentation/widgets/phone_field.dart';
import '../../../settings/presentation/widgets/settings_widgets.dart';
import '../../domain/medical_profile.dart';
import '../medical_labels.dart';

enum ContactError { incomplete, invalid }

/// One editable contact row. Owns its name controller; the parent disposes it.
class ContactDraft {
  ContactDraft({String name = '', this.relationship, this.phone = ''})
    : name = TextEditingController(text: name);

  /// Stable identity: rows can be removed from the middle of the list.
  final Key key = UniqueKey();
  final TextEditingController name;
  ContactRelationship? relationship;

  /// Local digits only: `+20` is added when saving.
  String phone;

  bool get isBlank =>
      name.text.trim().isEmpty && relationship == null && phone.isEmpty;

  void dispose() => name.dispose();
}

/// Up to [maxEmergencyContacts] contacts; the first is the primary one.
class EmergencyContactsEditor extends StatelessWidget {
  const EmergencyContactsEditor({
    required this.contacts,
    required this.errors,
    required this.onAdd,
    required this.onRemove,
    required this.onChanged,
    super.key,
  });

  final List<ContactDraft> contacts;
  final Map<Key, ContactError> errors;
  final VoidCallback onAdd;
  final ValueChanged<ContactDraft> onRemove;

  /// Called after any field of a row changes (so the form can clear its error).
  final ValueChanged<ContactDraft> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < contacts.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          KeyedSubtree(
            key: contacts[i].key,
            child: _ContactCard(
              index: i,
              contact: contacts[i],
              showPrimary: i == 0 && contacts.length > 1,
              removable: contacts.length > 1,
              error: errors[contacts[i].key],
              onRemove: () => onRemove(contacts[i]),
              onChanged: () => onChanged(contacts[i]),
            ),
          ),
        ],
        if (contacts.length < maxEmergencyContacts) ...[
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onAdd,
            icon: const Icon(Icons.add_rounded, size: 20),
            label: Text(l10n.medicalProfileAddContact),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              foregroundColor: p.text,
              side: BorderSide(color: p.border),
              shape: const StadiumBorder(),
            ),
          ),
        ],
      ],
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({
    required this.index,
    required this.contact,
    required this.showPrimary,
    required this.removable,
    required this.error,
    required this.onRemove,
    required this.onChanged,
  });

  final int index;
  final ContactDraft contact;
  final bool showPrimary;
  final bool removable;
  final ContactError? error;
  final VoidCallback onRemove;
  final VoidCallback onChanged;

  Future<void> _pickRelationship(BuildContext context) async {
    final l10n = context.l10n;
    final picked = await showChoiceSheet<ContactRelationship>(
      context,
      title: l10n.medicalProfileContactRelationship,
      options: ContactRelationship.values,
      value: contact.relationship,
      labelOf: (relationship) => relationshipLabel(l10n, relationship),
    );
    if (picked != null) {
      contact.relationship = picked;
      onChanged();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: error == null ? p.border : p.danger),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      l10n.medicalProfileContactNumber(index + 1),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    if (showPrimary)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: p.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          l10n.medicalProfilePrimary,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: p.primary,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (removable)
                TextButton.icon(
                  onPressed: onRemove,
                  icon: const Icon(Icons.delete_outline, size: 18),
                  label: Text(l10n.medicalProfileRemoveContact),
                  style: TextButton.styleFrom(foregroundColor: p.textMuted),
                ),
            ],
          ),
          const SizedBox(height: 12),
          AppTextField(
            label: l10n.medicalProfileContactName,
            controller: contact.name,
            maxLength: maxContactNameLength,
            textCapitalization: TextCapitalization.words,
            onChanged: (_) => onChanged(),
          ),
          const SizedBox(height: 12),
          PillSelect(
            label: l10n.medicalProfileContactRelationship,
            value: contact.relationship == null
                ? null
                : relationshipLabel(l10n, contact.relationship!),
            hint: l10n.medicalProfileNotSpecified,
            onTap: () => _pickRelationship(context),
          ),
          const SizedBox(height: 12),
          PhoneField(
            value: contact.phone,
            hasError: error == ContactError.invalid,
            onChanged: (digits) {
              contact.phone = digits;
              onChanged();
            },
          ),
          if (error == ContactError.incomplete) ...[
            const SizedBox(height: 8),
            Text(
              l10n.medicalProfileContactIncomplete,
              style: TextStyle(fontSize: 12, color: p.danger),
            ),
          ],
        ],
      ),
    );
  }
}
