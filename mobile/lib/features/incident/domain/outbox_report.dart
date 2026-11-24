import 'incident.dart';
import 'pending_attachment.dart';

/// A report that has been handed to the app for sending and must not be lost,
/// whatever the network does. Persisted to disk before the first attempt.
///
/// Sending is two phases, and progress through them is remembered so a crash or
/// a lost connection halfway resumes instead of restarting:
///   1. create the incident (idempotent: [request] carries a `clientRequestId`);
///   2. upload each attachment ([incidentId] is then set).
class OutboxReport {
  const OutboxReport({
    required this.userId,
    required this.request,
    required this.attachments,
    required this.capturedAt,
    this.incidentId,
    this.uploadedIds = const {},
    this.failedIds = const {},
    this.uploadAttempts = const {},
    this.uploadedPaths = const {},
  });

  factory OutboxReport.fromJson(Map<String, dynamic> json) => OutboxReport(
        userId: (json['userId'] as num).toInt(),
        request: SubmitIncidentRequest.fromJson(Map<String, dynamic>.from(json['request'] as Map)),
        attachments: [
          for (final item in (json['attachments'] as List<dynamic>? ?? const []))
            PendingAttachment.fromJson(Map<String, dynamic>.from(item as Map)),
        ],
        capturedAt: DateTime.parse(json['capturedAt'] as String),
        incidentId: (json['incidentId'] as num?)?.toInt(),
        uploadedIds: {for (final id in (json['uploadedIds'] as List<dynamic>? ?? const [])) id as String},
        failedIds: {for (final id in (json['failedIds'] as List<dynamic>? ?? const [])) id as String},
        uploadAttempts: {
          for (final e in (json['uploadAttempts'] as Map<dynamic, dynamic>? ?? const {}).entries)
            e.key as String: (e.value as num).toInt(),
        },
        uploadedPaths: {
          for (final e in (json['uploadedPaths'] as Map<dynamic, dynamic>? ?? const {}).entries)
            e.key as String: e.value as String,
        },
      );

  /// A saved report older than this needs the citizen's go-ahead before it is
  /// sent: their situation and location may have changed.
  static const staleAfter = Duration(minutes: 30);

  /// After this many failed attempts at one attachment it is given up on (the report itself is
  /// already with dispatch by then): a systematic upload problem must never keep a report
  /// "waiting" forever. The person can add the evidence again from the report screen.
  static const maxUploadAttempts = 3;

  final int userId;
  final SubmitIncidentRequest request;
  final List<PendingAttachment> attachments;
  final DateTime capturedAt;

  /// Set once the server has created the incident.
  final int? incidentId;
  final Set<String> uploadedIds;

  /// Attachments the server permanently refused (kept out of the retry loop).
  final Set<String> failedIds;

  /// Failed upload attempts per attachment id (survives an app restart).
  final Map<String, int> uploadAttempts;

  /// Attachment id -> its storage path, once the file is safely IN storage. A retry then only has to
  /// register it: it never asks for a new upload slot or sends the file again (that is what made every
  /// photo upload two, three, ... times).
  final Map<String, String> uploadedPaths;

  /// The idempotency key: identifies this report across every retry.
  String get id => request.clientRequestId ?? capturedAt.microsecondsSinceEpoch.toString();

  bool isStale(DateTime now) => now.difference(capturedAt) > staleAfter;

  List<PendingAttachment> get remaining =>
      [for (final a in attachments) if (!uploadedIds.contains(a.id) && !failedIds.contains(a.id)) a];

  OutboxReport copyWith({
    int? incidentId,
    Set<String>? uploadedIds,
    Set<String>? failedIds,
    Map<String, int>? uploadAttempts,
    Map<String, String>? uploadedPaths,
  }) =>
      OutboxReport(
        userId: userId,
        request: request,
        attachments: attachments,
        capturedAt: capturedAt,
        incidentId: incidentId ?? this.incidentId,
        uploadedIds: uploadedIds ?? this.uploadedIds,
        failedIds: failedIds ?? this.failedIds,
        uploadAttempts: uploadAttempts ?? this.uploadAttempts,
        uploadedPaths: uploadedPaths ?? this.uploadedPaths,
      );

  Map<String, Object?> toJson() => {
        'userId': userId,
        'request': request.toJson(),
        'attachments': [for (final a in attachments) a.toJson()],
        'capturedAt': capturedAt.toIso8601String(),
        'incidentId': incidentId,
        'uploadedIds': uploadedIds.toList(),
        'failedIds': failedIds.toList(),
        'uploadAttempts': uploadAttempts,
        'uploadedPaths': uploadedPaths,
      };
}
