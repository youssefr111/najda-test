import '../../../core/utils/wire_enum.dart';
import 'incident.dart';
import 'pending_attachment.dart';

/// The report form as the citizen is filling it in. Saved to disk as they type,
/// so a reload, crash or lost connection never makes them start over.
///
/// Position is deliberately NOT part of a draft: a stored location is stale the
/// moment the person moves, so it is always taken fresh.
class ReportDraft {
  const ReportDraft({
    this.category = IncidentCategory.medical,
    this.description = '',
    this.injuredCount = 0,
    this.shareMedicalProfile = true,
    this.reportedFor = ReportedFor.self,
    this.attachments = const [],
  });

  factory ReportDraft.fromJson(Map<String, dynamic> json) => ReportDraft(
        category: enumFromWire(IncidentCategory.values, json['category'], fallback: IncidentCategory.medical),
        description: json['description'] as String? ?? '',
        injuredCount: (json['injuredCount'] as num?)?.toInt() ?? 0,
        shareMedicalProfile: json['shareMedicalProfile'] as bool? ?? true,
        reportedFor: ReportedFor.fromWire(json['reportedFor']),
        attachments: [
          for (final item in (json['attachments'] as List<dynamic>? ?? const []))
            PendingAttachment.fromJson(Map<String, dynamic>.from(item as Map)),
        ],
      );

  final IncidentCategory category;
  final String description;
  final int injuredCount;
  final bool shareMedicalProfile;
  final ReportedFor reportedFor;
  final List<PendingAttachment> attachments;

  /// No typed or attached content. A different category alone still counts as
  /// "blank" here: it is worth remembering, but not worth announcing as a
  /// "restored report".
  bool get isBlank => description.trim().isEmpty && injuredCount == 0 && attachments.isEmpty;

  /// Identical to a brand-new form: nothing to save at all.
  bool get isPristine => isBlank && category == IncidentCategory.medical;

  ReportDraft copyWith({
    IncidentCategory? category,
    String? description,
    int? injuredCount,
    bool? shareMedicalProfile,
    ReportedFor? reportedFor,
    List<PendingAttachment>? attachments,
  }) =>
      ReportDraft(
        category: category ?? this.category,
        description: description ?? this.description,
        injuredCount: injuredCount ?? this.injuredCount,
        shareMedicalProfile: shareMedicalProfile ?? this.shareMedicalProfile,
        reportedFor: reportedFor ?? this.reportedFor,
        attachments: attachments ?? this.attachments,
      );

  Map<String, Object?> toJson() => {
        'category': category.wire,
        'description': description,
        'injuredCount': injuredCount,
        'shareMedicalProfile': shareMedicalProfile,
        'reportedFor': reportedFor.wire,
        'attachments': [for (final a in attachments) a.toJson()],
      };
}
