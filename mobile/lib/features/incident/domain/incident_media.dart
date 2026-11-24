import '../../../core/network/json.dart';
import '../../../core/utils/wire_enum.dart';

enum MediaKind implements WireEnum {
  photo('PHOTO'),
  video('VIDEO'),
  audio('AUDIO'),
  text('TEXT');

  const MediaKind(this.wire);
  @override
  final String wire;
}

/// One piece of evidence attached to an incident. [textContent] is only set for
/// the caller's written message (`MediaKind.text`).
class IncidentMedia {
  const IncidentMedia({
    required this.id,
    required this.kind,
    required this.textContent,
    required this.uploadedAt,
  });

  factory IncidentMedia.fromJson(Map<String, dynamic> json) => IncidentMedia(
    id: json['id'] as int,
    kind: enumFromWire(MediaKind.values, json['mediaType']),
    textContent: json['textContent'] as String?,
    uploadedAt: parseDate(json['uploadedAt']),
  );

  final int id;
  final MediaKind kind;
  final String? textContent;
  final DateTime uploadedAt;
}
