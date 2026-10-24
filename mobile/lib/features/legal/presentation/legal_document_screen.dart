import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_button.dart';
import '../application/legal_providers.dart';
import '../domain/legal.dart';
import 'legal_document_body.dart';
import 'legal_page.dart';

/// The Terms or Privacy Policy, read from the backend (and cached for offline use).
class LegalDocumentScreen extends ConsumerWidget {
  const LegalDocumentScreen({required this.type, super.key});

  final LegalDocumentType type;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final language = Localizations.localeOf(context).languageCode;
    final fallbackTitle = type == LegalDocumentType.terms
        ? l10n.legalTermsTitle
        : l10n.legalPrivacyTitle;

    return ref
        .watch(legalDocumentProvider(type))
        .when(
          loading: () => LegalPage(
            title: fallbackTitle,
            children: const [Center(child: CircularProgressIndicator())],
          ),
          error: (_, _) => _Unavailable(title: fallbackTitle, type: type),
          data: (document) {
            if (document == null) {
              return _Unavailable(title: fallbackTitle, type: type);
            }
            final date = DateFormat.yMMMMd(
              Localizations.localeOf(context).toString(),
            ).format(document.publishedAt);
            return LegalPage(
              title: document.content.title.resolve(language),
              intro: document.content.subtitle?.resolve(language),
              children: [
                Text(
                  l10n.legalVersionLine(document.version, date),
                  style: TextStyle(fontSize: 12, color: p.textMuted),
                ),
                const SizedBox(height: 16),
                LegalDocumentBody(
                  content: document.content,
                  language: language,
                  onLinkTap: (path) => context.push(path),
                ),
              ],
            );
          },
        );
  }
}

class _Unavailable extends ConsumerWidget {
  const _Unavailable({required this.title, required this.type});

  final String title;
  final LegalDocumentType type;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return LegalPage(
      title: title,
      children: [
        Text(
          l10n.legalUnavailable,
          style: TextStyle(fontSize: 15, height: 1.5, color: context.palette.textMuted),
        ),
        const SizedBox(height: 16),
        AppButton(
          label: l10n.commonRetry,
          variant: AppButtonVariant.ghost,
          onPressed: () => ref.invalidate(legalDocumentProvider(type)),
        ),
      ],
    );
  }
}
