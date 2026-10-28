import '../../../core/l10n/l10n_x.dart';
import '../domain/medical_profile.dart';

/// "A+", "O-"... Blood groups read the same in every language.
String bloodTypeLabel(BloodType value) => switch (value) {
  BloodType.aPositive => 'A+',
  BloodType.aNegative => 'A-',
  BloodType.bPositive => 'B+',
  BloodType.bNegative => 'B-',
  BloodType.abPositive => 'AB+',
  BloodType.abNegative => 'AB-',
  BloodType.oPositive => 'O+',
  BloodType.oNegative => 'O-',
};

String allergyLabel(AppLocalizations l10n, Allergy value) => switch (value) {
  Allergy.penicillin => l10n.medAllergyPenicillin,
  Allergy.sulfa => l10n.medAllergySulfa,
  Allergy.aspirin => l10n.medAllergyAspirin,
  Allergy.nsaids => l10n.medAllergyNsaids,
  Allergy.codeine => l10n.medAllergyCodeine,
  Allergy.contrastDye => l10n.medAllergyContrastDye,
  Allergy.peanuts => l10n.medAllergyPeanuts,
  Allergy.treeNuts => l10n.medAllergyTreeNuts,
  Allergy.eggs => l10n.medAllergyEggs,
  Allergy.milk => l10n.medAllergyMilk,
  Allergy.shellfish => l10n.medAllergyShellfish,
  Allergy.latex => l10n.medAllergyLatex,
  Allergy.insectStings => l10n.medAllergyInsectStings,
};

String conditionLabel(AppLocalizations l10n, MedicalCondition value) =>
    switch (value) {
      MedicalCondition.asthma => l10n.medConditionAsthma,
      MedicalCondition.diabetesType1 => l10n.medConditionDiabetesType1,
      MedicalCondition.diabetesType2 => l10n.medConditionDiabetesType2,
      MedicalCondition.epilepsy => l10n.medConditionEpilepsy,
      MedicalCondition.heartDisease => l10n.medConditionHeartDisease,
      MedicalCondition.hypertension => l10n.medConditionHypertension,
      MedicalCondition.strokeHistory => l10n.medConditionStrokeHistory,
      MedicalCondition.kidneyDisease => l10n.medConditionKidneyDisease,
      MedicalCondition.pacemakerOrImplant =>
        l10n.medConditionPacemakerOrImplant,
      MedicalCondition.onBloodThinners => l10n.medConditionOnBloodThinners,
      MedicalCondition.pregnancy => l10n.medConditionPregnancy,
      MedicalCondition.g6pdDeficiency => l10n.medConditionG6pdDeficiency,
    };

String relationshipLabel(AppLocalizations l10n, ContactRelationship value) =>
    switch (value) {
      ContactRelationship.parent => l10n.medRelationshipParent,
      ContactRelationship.spouse => l10n.medRelationshipSpouse,
      ContactRelationship.sibling => l10n.medRelationshipSibling,
      ContactRelationship.child => l10n.medRelationshipChild,
      ContactRelationship.relative => l10n.medRelationshipRelative,
      ContactRelationship.friend => l10n.medRelationshipFriend,
      ContactRelationship.other => l10n.medRelationshipOther,
    };
