import 'package:flutter/material.dart';

import '../domain/legal.dart';
import 'legal_document_screen.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      const LegalDocumentScreen(type: LegalDocumentType.terms);
}
