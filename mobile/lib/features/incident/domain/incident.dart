import '../../../core/network/json.dart';
import '../../../core/utils/wire_enum.dart';
import 'incident_media.dart';

enum IncidentCategory implements WireEnum {
  medical('MEDICAL'),
  police('POLICE'),
  fire('FIRE');

  const IncidentCategory(this.wire);
  @override
  final String wire;
}

enum LocationSource implements WireEnum {
  gps('GPS'),
  manualPin('MANUAL_PIN');

  const LocationSource(this.wire);
  @override
  final String wire;
}

enum IncidentStatus implements WireEnum {
  created('NEW'),
  aiProcessed('AI_PROCESSED'),
  dispatcherReview('DISPATCHER_REVIEW'),
  assigned('ASSIGNED'),
  inProgress('IN_PROGRESS'),
  resolved('RESOLVED'),
  cancelled('CANCELLED');

  const IncidentStatus(this.wire);
  @override
  final String wire;

  /// The report is still waiting on dispatch: details can still be edited.
  bool get isEditableByCitizen => this == created || this == aiProcessed || this == dispatcherReview;

  /// A citizen can withdraw a report until it is closed (the backend also
  /// refuses once a unit has arrived on scene).
  bool get isCancellableByCitizen => this != resolved && this != cancelled;

  bool get acceptsEvidence => isCancellableByCitizen;

  /// Once a unit has accepted, the backend requires a reason to cancel.
  bool get cancelNeedsReason => this == assigned || this == inProgress;
}

enum CancellationCategory implements WireEnum {
  submittedByMistake('SUBMITTED_BY_MISTAKE'),
  situationResolved('SITUATION_RESOLVED'),
  gotHelpElsewhere('GOT_HELP_ELSEWHERE'),
  duplicateReport('DUPLICATE_REPORT'),
  other('OTHER');

  const CancellationCategory(this.wire);
  @override
  final String wire;

  /// The backend requires a free-text explanation for "other".
  bool get needsDetails => this == other;
}

enum AiPriority implements WireEnum {
  critical('CRITICAL'),
  high('HIGH'),
  medium('MEDIUM'),
  low('LOW');

  const AiPriority(this.wire);
  @override
  final String wire;
}

/// Mirrors the backend's incident response.
class Incident {
  const Incident({
    required this.id,
    required this.citizenId,
    required this.citizenName,
    required this.category,
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.locationSource,
    required this.injuredCount,
    required this.status,
    required this.aiPriority,
    required this.createdAt,
    required this.cancellationCategory,
    required this.cancellationReason,
    required this.closedAsFalseReport,
    required this.media,
    this.reportedFor = ReportedFor.self,
  });

  factory Incident.fromJson(Map<String, dynamic> json) => Incident(
        id: json['id'] as int,
        citizenId: json['citizenId'] as int,
        citizenName: json['citizenName'] as String? ?? '',
        category: enumFromWire(IncidentCategory.values, json['category']),
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        address: json['address'] as String?,
        locationSource: enumFromWire(LocationSource.values, json['locationSource']),
        injuredCount: json['injuredCount'] as int? ?? 0,
        status: enumFromWire(IncidentStatus.values, json['status']),
        aiPriority: json['aiPriority'] == null
            ? null
            : enumFromWire(AiPriority.values, json['aiPriority']),
        createdAt: parseDate(json['createdAt']),
        cancellationCategory: json['cancellationCategory'] == null
            ? null
            : enumFromWire(CancellationCategory.values, json['cancellationCategory']),
        cancellationReason: json['cancellationReason'] as String?,
        closedAsFalseReport: json['falseReportType'] != null,
        reportedFor: ReportedFor.fromWire(json['reportedFor']),
        media: _parseMedia(json['media']),
      );

  /// Reads the attachments one by one: a single row the app cannot understand is skipped, instead of making
  /// the whole report (and its evidence) fail to load.
  static List<IncidentMedia> _parseMedia(Object? raw) {
    final items = <IncidentMedia>[];
    for (final item in (raw as List<dynamic>? ?? const [])) {
      try {
        items.add(IncidentMedia.fromJson(Map<String, dynamic>.from(item as Map)));
      } catch (_) {
        // skip
      }
    }
    return items;
  }

  final int id;
  final int citizenId;
  final String citizenName;
  final IncidentCategory category;
  final double latitude;
  final double longitude;
  final String? address;
  final LocationSource locationSource;
  final int injuredCount;
  final IncidentStatus status;
  final AiPriority? aiPriority;
  final DateTime createdAt;
  final CancellationCategory? cancellationCategory;
  final String? cancellationReason;

  /// Dispatch closed this report as a false report.
  final bool closedAsFalseReport;

  /// Who the emergency is about. For "someone else" the reporter's medical profile does not apply.
  final ReportedFor reportedFor;

  final List<IncidentMedia> media;

  IncidentMedia? get messageMedia =>
      media.where((m) => m.kind == MediaKind.text).firstOrNull;
  List<IncidentMedia> get evidence =>
      media.where((m) => m.kind != MediaKind.text).toList();
}

/// Who the emergency is about. It decides whether the reporter's medical profile may be used at all:
/// that profile describes the REPORTER, so it can only ever apply when the reporter is the patient.
enum ReportedFor {
  self('SELF'),
  other('OTHER');

  const ReportedFor(this.wire);
  final String wire;

  static ReportedFor fromWire(Object? value) =>
      value == 'OTHER' ? ReportedFor.other : ReportedFor.self;
}

/// What `POST /api/incidents` accepts. Mirrors the backend's `SubmitIncidentRequest`.
class SubmitIncidentRequest {
  const SubmitIncidentRequest({
    required this.category,
    required this.textMessage,
    required this.latitude,
    required this.longitude,
    required this.locationSource,
    required this.injuredCount,
    this.shareMedicalProfile = true,
    this.reportedFor = ReportedFor.self,
    this.deviceLatitude,
    this.deviceLongitude,
    this.clientRequestId,
  });

  factory SubmitIncidentRequest.fromJson(Map<String, dynamic> json) => SubmitIncidentRequest(
        category: enumFromWire(IncidentCategory.values, json['category']),
        textMessage: json['textMessage'] as String?,
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        locationSource: enumFromWire(LocationSource.values, json['locationSource']),
        injuredCount: (json['injuredCount'] as num?)?.toInt() ?? 0,
        shareMedicalProfile: json['shareMedicalProfile'] as bool? ?? true,
        reportedFor: ReportedFor.fromWire(json['reportedFor']),
        deviceLatitude: (json['deviceLatitude'] as num?)?.toDouble(),
        deviceLongitude: (json['deviceLongitude'] as num?)?.toDouble(),
        clientRequestId: json['clientRequestId'] as String?,
      );

  final IncidentCategory category;
  final String? textMessage;
  final double latitude;
  final double longitude;
  final LocationSource locationSource;
  final int injuredCount;

  /// "Share my medical profile with responders" for this report (the backend
  /// also requires the standing consent on the profile itself).
  final bool shareMedicalProfile;

  /// Me or someone else. "Someone else" never shares the reporter's medical profile.
  final ReportedFor reportedFor;

  /// The device's own GPS fix; the server checks a manually moved pin against it.
  final double? deviceLatitude;
  final double? deviceLongitude;

  /// Random id that makes submitting idempotent: a retry carrying the same id
  /// gets the original incident back instead of creating a second one.
  final String? clientRequestId;

  Map<String, Object?> toJson() => {
        'category': category.wire,
        'textMessage': textMessage,
        'latitude': latitude,
        'longitude': longitude,
        'locationSource': locationSource.wire,
        'injuredCount': injuredCount,
        'shareMedicalProfile': shareMedicalProfile,
        'reportedFor': reportedFor.wire,
        'deviceLatitude': deviceLatitude,
        'deviceLongitude': deviceLongitude,
        'clientRequestId': clientRequestId,
      };
}
