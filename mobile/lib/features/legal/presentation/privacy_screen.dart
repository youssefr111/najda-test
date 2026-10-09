import 'package:flutter/material.dart';

import '../../../core/l10n/l10n_x.dart';
import 'legal_page.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return LegalPage(
      title: l10n.legalPrivacyTitle,
      intro: l10n.legalPrivacySubtitle,
      children: [
        LegalSection(
          title: l10n.legalPrivacyCollectTitle,
          bullets: [
            l10n.legalPrivacyAccountInfo,
            l10n.legalPrivacyLocationData,
            l10n.legalPrivacyMediaData,
            l10n.legalPrivacyUsageData,
          ],
        ),
        LegalSection(
          title: l10n.legalPrivacyUsedTitle,
          body: '${l10n.legalPrivacyUsedBody1}\n\n${l10n.legalPrivacyUsedBody2}',
        ),
        LegalSection(title: l10n.legalPrivacyStoredTitle, body: l10n.legalPrivacyStoredBody),
        LegalSection(title: l10n.legalPrivacyThirdPartiesTitle, body: l10n.legalPrivacyThirdPartiesBody),
        LegalSection(title: l10n.legalPrivacyDontTitle, body: l10n.legalPrivacyDontBody),
        LegalSection(title: l10n.legalPrivacyContactTitle, body: l10n.legalPrivacyContactBody),
      ],
    );
  }
}
