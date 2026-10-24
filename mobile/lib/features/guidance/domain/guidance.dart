import 'package:flutter/foundation.dart';

import '../../incident/domain/incident.dart';

/// One text in every supported language (`{"en": "...", "ar": "..."}`).
@immutable
class LocalizedText {
  const LocalizedText(this._values);

  factory LocalizedText.fromJson(Object? json) => LocalizedText({
    for (final entry in (json! as Map).entries)
      entry.key as String: entry.value as String,
  });

  static LocalizedText? tryFromJson(Object? json) =>
      json is Map ? LocalizedText.fromJson(json) : null;

  final Map<String, String> _values;

  /// The text in [languageCode], falling back to English, then to nothing.
  String resolve(String languageCode) =>
      _values[languageCode] ?? _values['en'] ?? _values.values.firstOrNull ?? '';
}

@immutable
class GuidanceCard {
  const GuidanceCard({
    required this.id,
    required this.isGeneral,
    required this.minInjured,
    required this.title,
    required this.steps,
    required this.warning,
  });

  factory GuidanceCard.fromJson(Map<String, dynamic> json) => GuidanceCard(
    id: json['id'] as String,
    isGeneral: json['general'] as bool? ?? false,
    minInjured: (json['minInjured'] as num?)?.toInt(),
    title: LocalizedText.fromJson(json['title']),
    steps: [
      for (final step in json['steps'] as List<dynamic>)
        LocalizedText.fromJson(step),
    ],
    warning: LocalizedText.tryFromJson(json['warning']),
  );

  final String id;

  /// The category's main card: listed first and opened by default.
  final bool isGeneral;

  /// Only shown when the report has at least this many injured people.
  final int? minInjured;
  final LocalizedText title;
  final List<LocalizedText> steps;
  final LocalizedText? warning;
}

/// The backend's guidance document (`GET /api/guidance`): one source of truth
/// shared with the web app, edited by admins in the dashboard.
@immutable
class GuidanceContent {
  const GuidanceContent({required this.disclaimer, required this.cards});

  factory GuidanceContent.fromJson(Map<String, dynamic> response) {
    final content = response['content'] as Map<String, dynamic>;
    final cards = <IncidentCategory, List<GuidanceCard>>{};
    for (final entry in content['categories'] as List<dynamic>) {
      final json = entry as Map<String, dynamic>;
      final category = IncidentCategory.values
          .where((value) => value.wire == json['category'])
          .firstOrNull;
      // A category this app version doesn't know yet is simply not shown.
      if (category == null) continue;
      cards[category] = [
        for (final card in json['cards'] as List<dynamic>)
          GuidanceCard.fromJson(card as Map<String, dynamic>),
      ];
    }
    return GuidanceContent(
      disclaimer: LocalizedText.fromJson(content['disclaimer']),
      cards: cards,
    );
  }

  final LocalizedText disclaimer;
  final Map<IncidentCategory, List<GuidanceCard>> cards;

  /// The cards for a report, general card first.
  List<GuidanceCard> cardsFor(IncidentCategory category, int injuredCount) {
    final visible = (cards[category] ?? const <GuidanceCard>[])
        .where((card) => card.minInjured == null || injuredCount >= card.minInjured!)
        .toList();
    return [
      ...visible.where((card) => card.isGeneral),
      ...visible.where((card) => !card.isGeneral),
    ];
  }
}
