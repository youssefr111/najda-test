import '../../../core/utils/wire_enum.dart';
import 'incident_media.dart';

/// Evidence captured on the device and not yet uploaded. Lives in the app's own
/// storage (never the OS cache), so it survives a restart and the system
/// cleaning temporary files.
class PendingAttachment {
  const PendingAttachment({
    required this.id,
    required this.kind,
    required this.path,
    this.duration,
  });

  factory PendingAttachment.fromJson(Map<String, dynamic> json) =>
      PendingAttachment(
        id: json['id'] as String,
        kind: enumFromWire(MediaKind.values, json['kind']),
        path: json['path'] as String,
        duration: json['durationMs'] == null
            ? null
            : Duration(milliseconds: (json['durationMs'] as num).toInt()),
      );

  final String id;
  final MediaKind kind; // photo / video / audio
  final String path;
  final Duration? duration;

  PendingAttachment copyWith({String? path}) => PendingAttachment(
    id: id,
    kind: kind,
    path: path ?? this.path,
    duration: duration,
  );

  Map<String, Object?> toJson() => {
    'id': id,
    'kind': kind.wire,
    'path': path,
    'durationMs': duration?.inMilliseconds,
  };
}
