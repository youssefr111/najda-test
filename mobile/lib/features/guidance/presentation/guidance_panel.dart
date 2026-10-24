import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_card.dart';
import '../../incident/domain/incident.dart';
import '../application/guidance_provider.dart';
import '../domain/guidance.dart';

/// "Until help arrives" tips for the citizen on an active report. The content
/// is written and translated by admins in the dashboard.
class GuidancePanel extends ConsumerWidget {
  const GuidancePanel({
    required this.category,
    required this.injuredCount,
    super.key,
  });

  final IncidentCategory category;
  final int injuredCount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final language = Localizations.localeOf(context).languageCode;

    return ref
        .watch(guidanceProvider)
        .when(
          loading: () => const SizedBox.shrink(),
          error: (_, _) => const SizedBox.shrink(),
          data: (content) {
            if (content == null) {
              return AppCard(
                child: Text(
                  l10n.guidanceUnavailable,
                  style: TextStyle(fontSize: 13, height: 1.4, color: p.textMuted),
                ),
              );
            }
            final cards = content.cardsFor(category, injuredCount);
            if (cards.isEmpty) return const SizedBox.shrink();

            return AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Icon(Icons.health_and_safety_outlined, color: p.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          l10n.guidanceTitle,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    content.disclaimer.resolve(language),
                    style: TextStyle(fontSize: 12, height: 1.4, color: p.textMuted),
                  ),
                  const SizedBox(height: 12),
                  for (final card in cards)
                    _GuidanceTile(card: card, language: language),
                ],
              ),
            );
          },
        );
  }
}

class _GuidanceTile extends StatelessWidget {
  const _GuidanceTile({required this.card, required this.language});

  final GuidanceCard card;
  final String language;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final warning = card.warning;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: p.surfaceAlt,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.border),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          key: PageStorageKey<String>(card.id),
          initiallyExpanded: card.isGeneral,
          tilePadding: const EdgeInsets.symmetric(horizontal: 12),
          childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          expandedCrossAxisAlignment: CrossAxisAlignment.start,
          iconColor: p.textMuted,
          collapsedIconColor: p.textMuted,
          title: Text(
            card.title.resolve(language),
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: p.text),
          ),
          children: [
            for (var i = 0; i < card.steps.length; i++)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: p.primary, shape: BoxShape.circle),
                      child: Text(
                        '${i + 1}',
                        style: TextStyle(
                          color: p.onPrimary,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        card.steps[i].resolve(language),
                        style: TextStyle(fontSize: 14, height: 1.4, color: p.text),
                      ),
                    ),
                  ],
                ),
              ),
            if (warning != null) _WarningNote(text: warning.resolve(language)),
          ],
        ),
      ),
    );
  }
}

class _WarningNote extends StatelessWidget {
  const _WarningNote({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: p.warning.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, size: 18, color: p.warning),
          const SizedBox(width: 8),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: '${context.l10n.guidanceImportant}: ',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: text),
                ],
              ),
              style: TextStyle(fontSize: 13, height: 1.4, color: p.text),
            ),
          ),
        ],
      ),
    );
  }
}
