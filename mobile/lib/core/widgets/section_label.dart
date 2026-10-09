import 'package:flutter/material.dart';

import '../theme/app_palette.dart';

class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: context.palette.textMuted),
      );
}
