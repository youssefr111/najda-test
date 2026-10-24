import 'package:flutter/foundation.dart';

import '../../guidance/domain/guidance.dart';

enum LegalDocumentType {
  terms,
  privacy;

  /// The form used in API paths ("terms") and cache keys.
  String get slug => name;

  static LegalDocumentType fromWire(String wire) => LegalDocumentType.values
      .firstWhere((type) => type.name.toUpperCase() == wire);
}

enum LegalBlockType { heading, paragraph, notice, list }

/// A heading, paragraph or notice (uses [text]) or a bulleted list (uses [items]).
@immutable
class LegalBlock {
  const LegalBlock({required this.type, this.text, this.items = const []});

  /// Null for a block type this app version doesn't know yet (it is skipped).
  static LegalBlock? tryFromJson(Map<String, dynamic> json) {
    final type = LegalBlockType.values
        .where((value) => value.name.toUpperCase() == json['type'])
        .firstOrNull;
    if (type == null) return null;
    return LegalBlock(
      type: type,
      text: LocalizedText.tryFromJson(json['text']),
      items: [
        for (final item in (json['items'] as List<dynamic>? ?? const []))
          LocalizedText.fromJson(item),
      ],
    );
  }

  final LegalBlockType type;
  final LocalizedText? text;
  final List<LocalizedText> items;
}

@immutable
class LegalSection {
  const LegalSection({
    required this.id,
    required this.title,
    required this.blocks,
  });

  factory LegalSection.fromJson(Map<String, dynamic> json) => LegalSection(
    id: json['id'] as String,
    title: LocalizedText.fromJson(json['title']),
    blocks: [
      for (final block in json['blocks'] as List<dynamic>)
        ?LegalBlock.tryFromJson(block as Map<String, dynamic>),
    ],
  );

  final String id;
  final LocalizedText title;
  final List<LegalBlock> blocks;
}

@immutable
class LegalContent {
  const LegalContent({
    required this.title,
    required this.subtitle,
    required this.sections,
  });

  factory LegalContent.fromJson(Map<String, dynamic> json) => LegalContent(
    title: LocalizedText.fromJson(json['title']),
    subtitle: LocalizedText.tryFromJson(json['subtitle']),
    sections: [
      for (final section in json['sections'] as List<dynamic>)
        LegalSection.fromJson(section as Map<String, dynamic>),
    ],
  );

  final LocalizedText title;
  final LocalizedText? subtitle;
  final List<LegalSection> sections;
}

/// The version of a legal document currently in force (`GET /api/legal/documents/{type}`).
@immutable
class LegalDocument {
  const LegalDocument({
    required this.type,
    required this.version,
    required this.publishedAt,
    required this.content,
  });

  factory LegalDocument.fromJson(Map<String, dynamic> json) => LegalDocument(
    type: LegalDocumentType.fromWire(json['type'] as String),
    version: json['version'] as int,
    publishedAt: DateTime.parse(json['publishedAt'] as String).toLocal(),
    content: LegalContent.fromJson(json['content'] as Map<String, dynamic>),
  );

  final LegalDocumentType type;
  final int version;
  final DateTime publishedAt;
  final LegalContent content;
}

/// A document the signed-in person still has to accept: always the latest version.
@immutable
class PendingConsent {
  const PendingConsent({
    required this.type,
    required this.versionId,
    required this.version,
    required this.title,
    required this.changeSummary,
  });

  factory PendingConsent.fromJson(Map<String, dynamic> json) => PendingConsent(
    type: LegalDocumentType.fromWire(json['type'] as String),
    versionId: (json['versionId'] as num).toInt(),
    version: json['version'] as int,
    title: LocalizedText.fromJson(json['title']),
    changeSummary: LocalizedText.tryFromJson(json['changeSummary']),
  );

  final LegalDocumentType type;
  final int versionId;
  final int version;
  final LocalizedText title;
  final LocalizedText? changeSummary;
}
