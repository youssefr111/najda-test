import 'package:flutter/material.dart';

import '../../../core/l10n/l10n_x.dart';
import 'legal_page.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return LegalPage(
      title: l10n.legalTermsTitle,
      children: [
        LegalSection(title: l10n.legalTermsSimulationTitle, body: l10n.legalTermsSimulationBody),
        LegalSection(title: l10n.legalTermsAcceptableUseTitle, body: l10n.legalTermsAcceptableUseBody),
        LegalSection(title: l10n.legalTermsAccountsTitle, body: l10n.legalTermsAccountsBody),
        LegalSection(title: l10n.legalTermsApplicationsTitle, body: l10n.legalTermsApplicationsBody),
        LegalSection(title: l10n.legalTermsWarrantyTitle, body: l10n.legalTermsWarrantyBody),
        LegalSection(title: l10n.legalTermsContactTitle, body: l10n.legalTermsContactBody),
      ],
    );
  }
}
