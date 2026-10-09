import 'package:flutter/material.dart';

import '../../../core/l10n/l10n_x.dart';
import 'legal_page.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return LegalPage(
      title: l10n.aboutTitle,
      intro: l10n.aboutDescription,
      children: [
        LegalSection(title: l10n.aboutSectionTitle, body: l10n.aboutSectionDescription),
        LegalSection(title: l10n.aboutSectionTitle2, body: l10n.aboutSectionDescription2),
      ],
    );
  }
}
