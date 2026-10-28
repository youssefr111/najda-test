import 'package:flutter/material.dart';

import '../../../core/theme/app_palette.dart';
import '../domain/legal.dart';
import 'legal_rich_text.dart';

/// The sections of a legal document, shared by the Terms / Privacy screens and the acceptance prompt.
class LegalDocumentBody extends StatelessWidget {
  const LegalDocumentBody({
    required this.content,
    required this.language,
    super.key,
    this.onLinkTap,
  });

  final LegalContent content;
  final String language;
  final ValueChanged<String>? onLinkTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final body = TextStyle(fontSize: 15, height: 1.5, color: p.textMuted);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final section in content.sections)
          Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  section.title.resolve(language),
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                for (final block in section.blocks)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: _Block(
                      block: block,
                      language: language,
                      style: body,
                      onLinkTap: onLinkTap,
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({
    required this.block,
    required this.language,
    required this.style,
    required this.onLinkTap,
  });

  final LegalBlock block;
  final String language;
  final TextStyle style;
  final ValueChanged<String>? onLinkTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final text = block.text?.resolve(language) ?? '';

    return switch (block.type) {
      LegalBlockType.heading => Text(
        text,
        style: style.copyWith(fontWeight: FontWeight.w700, color: p.text),
      ),
      LegalBlockType.notice => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: p.danger.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: p.danger.withValues(alpha: 0.4)),
        ),
        child: LegalRichText(
          text: text,
          style: style.copyWith(color: p.text),
          onLinkTap: onLinkTap,
        ),
      ),
      LegalBlockType.list => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final item in block.items)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 9),
                    child: Container(
                      height: 5,
                      width: 5,
                      decoration: BoxDecoration(
                        color: p.textMuted,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: LegalRichText(
                      text: item.resolve(language),
                      style: style,
                      onLinkTap: onLinkTap,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      LegalBlockType.paragraph => LegalRichText(
        text: text,
        style: style,
        onLinkTap: onLinkTap,
      ),
    };
  }
}
