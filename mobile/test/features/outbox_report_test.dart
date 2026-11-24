import 'package:flutter_test/flutter_test.dart';
import 'package:najda/features/incident/domain/incident.dart';
import 'package:najda/features/incident/domain/incident_media.dart';
import 'package:najda/features/incident/domain/outbox_report.dart';
import 'package:najda/features/incident/domain/pending_attachment.dart';
import 'package:najda/features/incident/domain/report_draft.dart';

SubmitIncidentRequest _request() => const SubmitIncidentRequest(
      category: IncidentCategory.fire,
      textMessage: 'Smoke from the second floor',
      latitude: 30.0444,
      longitude: 31.2357,
      locationSource: LocationSource.manualPin,
      injuredCount: 2,
      shareMedicalProfile: false,
      deviceLatitude: 30.0445,
      deviceLongitude: 31.2358,
      clientRequestId: 'abcdef0123456789abcdef0123456789',
    );

void main() {
  group('SubmitIncidentRequest', () {
    test('serialises everything the backend expects', () {
      final json = _request().toJson();

      expect(json['category'], 'FIRE');
      expect(json['locationSource'], 'MANUAL_PIN');
      expect(json['shareMedicalProfile'], false);
      expect(json['deviceLatitude'], 30.0445);
      expect(json['deviceLongitude'], 31.2358);
      expect(json['clientRequestId'], 'abcdef0123456789abcdef0123456789');
    });

    test('survives a JSON round trip (the outbox stores it on disk)', () {
      final restored = SubmitIncidentRequest.fromJson(_request().toJson().cast<String, dynamic>());

      expect(restored.category, IncidentCategory.fire);
      expect(restored.locationSource, LocationSource.manualPin);
      expect(restored.injuredCount, 2);
      expect(restored.clientRequestId, 'abcdef0123456789abcdef0123456789');
    });
  });

  group('OutboxReport', () {
    final captured = DateTime.utc(2026, 10, 15, 12);
    const photo = PendingAttachment(id: 'a', kind: MediaKind.photo, path: '/data/a.jpg');
    const audio = PendingAttachment(
      id: 'b',
      kind: MediaKind.audio,
      path: '/data/b.m4a',
      duration: Duration(seconds: 12),
    );

    OutboxReport report() => OutboxReport(
          userId: 7,
          request: _request(),
          attachments: const [photo, audio],
          capturedAt: captured,
        );

    test('uses the request id as its identity', () {
      expect(report().id, 'abcdef0123456789abcdef0123456789');
    });

    test('remaining shrinks as uploads succeed or are refused', () {
      var current = report();
      expect(current.remaining.map((a) => a.id), ['a', 'b']);

      current = current.copyWith(incidentId: 41, uploadedIds: {'a'});
      expect(current.remaining.map((a) => a.id), ['b']);

      current = current.copyWith(failedIds: {'b'});
      expect(current.remaining, isEmpty);
    });

    test('goes stale after 30 minutes', () {
      final r = report();
      expect(r.isStale(captured.add(const Duration(minutes: 29))), isFalse);
      expect(r.isStale(captured.add(const Duration(minutes: 31))), isTrue);
    });

    test('keeps its progress across a restart (JSON round trip)', () {
      final progressed = report().copyWith(incidentId: 41, uploadedIds: {'a'}, failedIds: {'b'});
      final restored = OutboxReport.fromJson(
        Map<String, dynamic>.from(progressed.toJson()),
      );

      expect(restored.userId, 7);
      expect(restored.incidentId, 41);
      expect(restored.uploadedIds, {'a'});
      expect(restored.failedIds, {'b'});
      expect(restored.capturedAt, captured);
      expect(restored.attachments.last.duration, const Duration(seconds: 12));
      expect(restored.request.clientRequestId, progressed.request.clientRequestId);
    });
  });

  group('ReportDraft', () {
    test('a draft with only a category is blank but not pristine (the category is remembered)', () {
      expect(const ReportDraft(category: IncidentCategory.police).isBlank, isTrue);
      expect(const ReportDraft(category: IncidentCategory.police).isPristine, isFalse);
      expect(const ReportDraft().isPristine, isTrue);
      expect(const ReportDraft(description: 'help').isBlank, isFalse);
      expect(const ReportDraft(injuredCount: 1).isBlank, isFalse);
    });

    test('round-trips including attachments', () {
      const draft = ReportDraft(
        category: IncidentCategory.medical,
        description: 'Man collapsed',
        injuredCount: 1,
        shareMedicalProfile: false,
        attachments: [PendingAttachment(id: 'x', kind: MediaKind.video, path: '/data/x.mp4')],
      );
      final restored = ReportDraft.fromJson(Map<String, dynamic>.from(draft.toJson()));

      expect(restored.description, 'Man collapsed');
      expect(restored.shareMedicalProfile, isFalse);
      expect(restored.attachments.single.kind, MediaKind.video);
    });
  });
}
