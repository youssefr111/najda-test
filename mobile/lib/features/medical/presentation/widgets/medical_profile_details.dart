import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/l10n/l10n_x.dart';
import '../../../../core/theme/app_palette.dart';
import '../../domain/medical_profile.dart';
import '../medical_labels.dart';

/// Read-only view of a medical profile: the same widget serves the owner's
/// Account tab and the responder's patient panel.
class MedicalProfileDetails extends StatelessWidget {
  const MedicalProfileDetails({required this.profile, super.key});

  final MedicalProfile profile;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final age = profile.ageAt(DateTime.now());

    final facts = <(IconData, String, String)>[
      if (age != null)
        (
          Icons.cake_outlined,
          l10n.medicalProfileAge,
          l10n.medicalProfileAgeValue(age),
        ),
      if (profile.weightKg != null)
        (
          Icons.monitor_weight_outlined,
          l10n.medicalProfileWeight,
          '${profile.weightKg!.toStringAsFixed(profile.weightKg! % 1 == 0 ? 0 : 1)} ${l10n.medicalProfileKg}',
        ),
      if (profile.bloodType != null)
        (
          Icons.bloodtype_outlined,
          l10n.medicalProfileBloodType,
          bloodTypeLabel(profile.bloodType!),
        ),
    ];

    final blocks = <Widget>[
      if (facts.isNotEmpty)
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final f in facts) _Fact(icon: f.$1, label: f.$2, value: f.$3),
          ],
        ),
      if (profile.noKnownAllergies ||
          profile.allergies.isNotEmpty ||
          _has(profile.allergyNotes))
        _Block(
          title: l10n.medicalProfileAllergies,
          child: profile.noKnownAllergies
              ? _Muted(l10n.medicalProfileNoKnownAllergies)
              : _Tags(
                  labels: [
                    for (final a in profile.allergies) allergyLabel(l10n, a),
                  ],
                  notes: profile.allergyNotes,
                ),
        ),
      if (profile.noKnownConditions ||
          profile.conditions.isNotEmpty ||
          _has(profile.conditionNotes))
        _Block(
          title: l10n.medicalProfileConditions,
          child: profile.noKnownConditions
              ? _Muted(l10n.medicalProfileNoKnownConditions)
              : _Tags(
                  labels: [
                    for (final c in profile.conditions) conditionLabel(l10n, c),
                  ],
                  notes: profile.conditionNotes,
                ),
        ),
      if (_has(profile.currentMedications))
        _Block(
          title: l10n.medicalProfileMedications,
          child: _Body(profile.currentMedications!),
        ),
      if (_has(profile.medicalNotes))
        _Block(
          title: l10n.medicalProfileMedicalNotes,
          child: _Body(profile.medicalNotes!),
        ),
      if (profile.emergencyContacts.isNotEmpty)
        _Block(
          title: l10n.medicalProfileEmergencyContacts,
          child: Column(
            children: [
              for (var i = 0; i < profile.emergencyContacts.length; i++)
                _ContactRow(
                  contact: profile.emergencyContacts[i],
                  primary: i == 0 && profile.emergencyContacts.length > 1,
                ),
            ],
          ),
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < blocks.length; i++) ...[
          if (i > 0) const SizedBox(height: 18),
          blocks[i],
        ],
      ],
    );
  }

  static bool _has(String? text) => text != null && text.trim().isNotEmpty;
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: p.primary.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20, color: p.primary),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 11, color: p.textMuted)),
              Text(
                value,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: context.palette.textMuted,
        ),
      ),
      const SizedBox(height: 8),
      child,
    ],
  );
}

class _Muted extends StatelessWidget {
  const _Muted(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: TextStyle(
      fontSize: 14,
      fontStyle: FontStyle.italic,
      color: context.palette.textMuted,
    ),
  );
}

class _Body extends StatelessWidget {
  const _Body(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: TextStyle(fontSize: 15, height: 1.45, color: context.palette.text),
  );
}

class _Tags extends StatelessWidget {
  const _Tags({required this.labels, this.notes});

  final List<String> labels;
  final String? notes;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (labels.isNotEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final label in labels)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: p.surfaceAlt,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: p.border),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: p.text,
                    ),
                  ),
                ),
            ],
          ),
        if (notes != null && notes!.trim().isNotEmpty) ...[
          if (labels.isNotEmpty) const SizedBox(height: 8),
          _Body(notes!),
        ],
      ],
    );
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({required this.contact, required this.primary});

  final EmergencyContact contact;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      contact.name,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    if (primary)
                      Text(
                        l10n.medicalProfilePrimary,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: p.primary,
                        ),
                      ),
                  ],
                ),
                Text(
                  '${relationshipLabel(l10n, contact.relationship)} · ${contact.phone}',
                  textDirection: TextDirection.ltr,
                  style: TextStyle(fontSize: 13, color: p.textMuted),
                ),
              ],
            ),
          ),
          IconButton.filledTonal(
            tooltip: l10n.medicalProfileCallContact,
            onPressed: () => launchUrl(Uri(scheme: 'tel', path: contact.phone)),
            icon: const Icon(Icons.call, size: 20),
            style: IconButton.styleFrom(
              backgroundColor: p.primary.withValues(alpha: 0.1),
              foregroundColor: p.primary,
            ),
          ),
        ],
      ),
    );
  }
}
