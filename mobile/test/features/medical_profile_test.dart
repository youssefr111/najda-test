import 'package:flutter_test/flutter_test.dart';
import 'package:najda/features/applications/domain/document_rules.dart';
import 'package:najda/features/applications/domain/responder_application.dart';
import 'package:najda/features/medical/domain/medical_profile.dart';

void main() {
  group('Medical enums', () {
    test('wire codes match the backend (including digits)', () {
      expect(BloodType.abPositive.wire, 'AB_POSITIVE');
      expect(MedicalCondition.diabetesType1.wire, 'DIABETES_TYPE_1');
      expect(MedicalCondition.g6pdDeficiency.wire, 'G6PD_DEFICIENCY');
      expect(Allergy.contrastDye.wire, 'CONTRAST_DYE');
      expect(ContactRelationship.relative.wire, 'RELATIVE');
    });

    test('every code round-trips', () {
      for (final v in MedicalCondition.values) {
        expect(MedicalCondition.fromWire(v.wire), v);
      }
      for (final v in Allergy.values) {
        expect(Allergy.fromWire(v.wire), v);
      }
    });
  });

  group('MedicalProfile', () {
    test('an untouched profile is empty; consent alone does not make it non-empty', () {
      expect(MedicalProfile.empty.isEmpty, isTrue);
      expect(const MedicalProfile(shareWithResponders: true).isEmpty, isTrue);
      expect(const MedicalProfile(noKnownAllergies: true).isEmpty, isFalse);
    });

    test('request JSON is a full replacement with one-decimal weight and trimmed notes', () {
      final json = MedicalProfile(
        dateOfBirth: DateTime(1990, 3, 12),
        weightKg: 72.456,
        bloodType: BloodType.oNegative,
        allergies: {Allergy.peanuts},
        allergyNotes: '  sesame  ',
        medicalNotes: '   ',
        emergencyContacts: const [
          EmergencyContact(name: 'Sara', relationship: ContactRelationship.sibling, phone: '+201012345678'),
        ],
        shareWithResponders: true,
      ).toRequestJson();

      expect(json['dateOfBirth'], '1990-03-12');
      expect(json['weightKg'], 72.5);
      expect(json['bloodType'], 'O_NEGATIVE');
      expect(json['allergies'], ['PEANUTS']);
      expect(json['allergyNotes'], 'sesame');
      expect(json['medicalNotes'], isNull);
      expect(json['shareWithResponders'], isTrue);
    });

    test('parses the backend response', () {
      final profile = MedicalProfile.fromJson({
        'dateOfBirth': '1990-03-12',
        'weightKg': 70,
        'bloodType': 'A_POSITIVE',
        'noKnownAllergies': false,
        'allergies': ['PENICILLIN'],
        'conditions': ['DIABETES_TYPE_2'],
        'emergencyContacts': [
          {'name': 'Omar', 'relationship': 'FRIEND', 'phone': '+201112223334'},
        ],
        'shareWithResponders': true,
        'updatedAt': '2026-01-01T10:00:00Z',
      });

      expect(profile.bloodType, BloodType.aPositive);
      expect(profile.conditions, {MedicalCondition.diabetesType2});
      expect(profile.emergencyContacts.single.relationship, ContactRelationship.friend);
      expect(profile.weightKg, 70.0);
    });

    test('age counts whole years', () {
      final profile = MedicalProfile(dateOfBirth: DateTime(1990, 6, 15));
      expect(profile.ageAt(DateTime(2026, 6, 14)), 35);
      expect(profile.ageAt(DateTime(2026, 6, 15)), 36);
      expect(MedicalProfile.empty.ageAt(DateTime(2026)), isNull);
    });

    test('goes stale after six months', () {
      final profile = MedicalProfile(bloodType: BloodType.aPositive, updatedAt: DateTime(2026, 1, 10));
      expect(profile.isStale(DateTime(2026, 6, 20)), isFalse);
      expect(profile.isStale(DateTime(2026, 7, 1)), isTrue);
      expect(MedicalProfile.empty.isStale(DateTime(2030)), isFalse);
    });

    test('incident profile reports "not shared" without a profile', () {
      final shared = IncidentMedicalProfile.fromJson({'shared': false, 'profile': null});
      expect(shared.shared, isFalse);
      expect(shared.profile, isNull);
    });
  });

  group('checkDocuments', () {
    PickedDocument doc(String name, int mb) => PickedDocument(path: '/x/$name', name: name, sizeBytes: mb * 1024 * 1024);

    test('accepts allowed types within the limits', () {
      final result = checkDocuments(const [], [doc('id.pdf', 2), doc('cert.JPG', 3)]);
      expect(result.accepted.length, 2);
      expect(result.problem, isNull);
    });

    test('rejects the wrong type, an oversized file, and an overflowing total', () {
      expect(checkDocuments(const [], [doc('virus.exe', 1)]).problem!.reason, DocumentProblemReason.type);
      expect(checkDocuments(const [], [doc('big.pdf', 11)]).problem!.reason, DocumentProblemReason.size);

      final current = [doc('a.pdf', 9), doc('b.pdf', 9)];
      final result = checkDocuments(current, [doc('c.pdf', 5)]);
      expect(result.accepted, isEmpty);
      expect(result.problem!.reason, DocumentProblemReason.total);
    });

    test('keeps the good files when one is rejected', () {
      final result = checkDocuments(const [], [doc('ok.pdf', 1), doc('bad.exe', 1)]);
      expect(result.accepted.map((d) => d.name), ['ok.pdf']);
      expect(result.problem!.fileName, 'bad.exe');
    });
  });
}
