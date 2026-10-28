import '../../../core/network/json.dart';
import '../../../core/utils/wire_enum.dart';

enum ApplicationStatus implements WireEnum {
  pending('PENDING'),
  approved('APPROVED'),
  rejected('REJECTED');

  const ApplicationStatus(this.wire);
  @override
  final String wire;
}

class ApplicationDocument {
  const ApplicationDocument({required this.id, required this.fileName});

  factory ApplicationDocument.fromJson(Map<String, dynamic> json) =>
      ApplicationDocument(
        id: json['id'] as int,
        fileName: json['originalFileName'] as String? ?? '',
      );

  final int id;
  final String fileName;
}

class ResponderApplication {
  const ResponderApplication({
    required this.id,
    required this.status,
    required this.motivation,
    required this.submittedAt,
    required this.reviewNotes,
    required this.documents,
  });

  factory ResponderApplication.fromJson(Map<String, dynamic> json) =>
      ResponderApplication(
        id: json['id'] as int,
        status: enumFromWire(ApplicationStatus.values, json['status']),
        motivation: json['motivation'] as String? ?? '',
        submittedAt: parseDate(json['submittedAt']),
        reviewNotes: json['reviewNotes'] as String?,
        documents: (json['documents'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>()
            .map(ApplicationDocument.fromJson)
            .toList(),
      );

  final int id;
  final ApplicationStatus status;
  final String motivation;
  final DateTime submittedAt;
  final String? reviewNotes;
  final List<ApplicationDocument> documents;
}

/// A document chosen on the device, not uploaded yet.
class PickedDocument {
  const PickedDocument({
    required this.path,
    required this.name,
    this.sizeBytes = 0,
  });

  final String path;
  final String name;
  final int sizeBytes;
}
