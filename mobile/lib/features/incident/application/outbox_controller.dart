import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/geo/geo_utils.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/connectivity_helper.dart';
import '../../auth/application/auth_controller.dart';
import '../data/incident_media_repository.dart';
import '../data/incident_repository.dart';
import '../data/report_storage.dart';
import '../domain/incident.dart';
import '../domain/outbox_report.dart';
import '../domain/pending_attachment.dart';
import 'incident_providers.dart';

/// Where a saved report is in its journey to the server.
enum OutboxPhase {
  /// Nothing to send.
  idle,

  /// An attempt is in flight.
  sending,

  /// Saved on the phone; will be retried (connection back, app resumed, timer).
  waiting,

  /// Saved a long time ago: the citizen must confirm before it goes out.
  needsConfirmation,

  /// The server refused the report. Only the citizen can decide what happens.
  rejected,
}

class OutboxState {
  const OutboxState({
    this.report,
    this.phase = OutboxPhase.idle,
    this.error,
    this.sentIncidentId,
    this.failedUploads = 0,
  });

  final OutboxReport? report;
  final OutboxPhase phase;

  /// The server's reason when [phase] is [OutboxPhase.rejected].
  final String? error;

  /// Set when a report that had been waiting was just delivered in the
  /// background, so the UI can tell the citizen. Cleared by [OutboxController.acknowledgeSent].
  final int? sentIncidentId;
  final int failedUploads;

  bool get hasReport => report != null;
}

/// What the report form is told after handing a report to the outbox.
sealed class OutboxSubmitResult {
  const OutboxSubmitResult();
}

/// The server has the report (and its attachments, except [failedUploads]).
final class OutboxSent extends OutboxSubmitResult {
  const OutboxSent(
    this.incidentId,
    this.failedUploads, {
    this.stillUploading = false,
  });

  final int incidentId;
  final int failedUploads;

  /// The report itself is with dispatch; some attachments are still being uploaded in the background.
  /// (Used to be reported as "no connection", which it plainly was not.)
  final bool stillUploading;
}

/// No usable connection: the report is safely stored and will be sent by itself.
final class OutboxQueued extends OutboxSubmitResult {
  const OutboxQueued();
}

/// The server turned the report down; nothing was stored, the form keeps its data.
final class OutboxRejected extends OutboxSubmitResult {
  const OutboxRejected(this.message);

  final String message;
}

final outboxControllerProvider =
    NotifierProvider<OutboxController, OutboxState>(OutboxController.new);

/// The offline-first sender for emergency reports.
///
/// Guarantees:
///  * **Durable first.** The report (and its media) is written to disk before
///    any network call, so a crash, kill or dead battery cannot lose it.
///  * **No duplicates.** Every attempt carries the same `clientRequestId`, so a
///    retry after a lost response returns the original incident. For servers
///    that predate that, a 409 is reconciled against "my reports" before giving up.
///  * **Resumable.** Progress through "create incident" and each upload is
///    saved; a retry continues where the last one stopped.
///  * **Polite.** Exponential backoff (30 s -> 5 min), no attempts while the
///    device is offline, one attempt at a time.
///  * **Honest.** Old reports ask before sending; refused reports are surfaced.
class OutboxController extends Notifier<OutboxState> {
  static const _baseDelay = Duration(seconds: 30);
  static const _maxDelay = Duration(minutes: 5);

  bool _busy = false;
  int _failures = 0;
  DateTime? _nextAttemptAt;
  bool _staleConfirmed = false;
  int? _userId;

  ReportStorage get _storage => ref.read(reportStorageProvider);

  @override
  OutboxState build() {
    final userId = ref.watch(currentUserProvider.select((user) => user?.id));
    final canFile = ref.watch(
      currentUserProvider.select((user) => user?.role.canFileReports ?? false),
    );
    _userId = userId;
    _failures = 0;
    _nextAttemptAt = null;
    _staleConfirmed = false;

    if (userId != null && canFile) Future.microtask(() => _load(userId));
    return const OutboxState();
  }

  Future<void> _load(int userId) async {
    final stored = await _storage.loadOutbox(userId);
    if (!ref.mounted || _userId != userId || stored == null) return;
    state = OutboxState(report: stored, phase: OutboxPhase.waiting);
    await trySend();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /// Hands a report over for sending. Stores it first, then tries right away.
  Future<OutboxSubmitResult> submit({
    required SubmitIncidentRequest request,
    required List<PendingAttachment> attachments,
  }) async {
    final userId = _userId;
    if (userId == null) return const OutboxRejected('Not signed in.');

    final copies = await _storage.copyToOutbox(userId, attachments);
    final report = OutboxReport(
      userId: userId,
      request: request,
      attachments: copies,
      capturedAt: DateTime.now(),
    );
    await _storage.saveOutbox(report);

    _failures = 0;
    _nextAttemptAt = null;
    _staleConfirmed = true; // it was written seconds ago
    state = OutboxState(report: report, phase: OutboxPhase.sending);

    return switch (await _attempt(initial: true)) {
      _Done(:final incidentId, :final failedUploads) => OutboxSent(
        incidentId,
        failedUploads,
      ),
      // The incident exists on the server; only attachments are pending. Not an offline situation.
      _Retry(:final incidentId?) => OutboxSent(
        incidentId,
        0,
        stillUploading: true,
      ),
      _Refused(:final message) => OutboxRejected(message),
      _ => const OutboxQueued(),
    };
  }

  /// Retries a saved report. [manual] (the citizen pressed "Send now") ignores
  /// the backoff and the "refused" hold.
  Future<void> trySend({bool manual = false}) async {
    final current = state;
    final report = current.report;
    if (report == null || _busy || current.phase == OutboxPhase.sending) return;
    if (!manual && current.phase == OutboxPhase.rejected) return;
    if (!manual &&
        _nextAttemptAt != null &&
        DateTime.now().isBefore(_nextAttemptAt!)) {
      return;
    }

    // An old report that never reached the server needs the citizen's go-ahead.
    if (report.incidentId == null &&
        report.isStale(DateTime.now()) &&
        !_staleConfirmed) {
      state = OutboxState(report: report, phase: OutboxPhase.needsConfirmation);
      return;
    }

    if (manual) _nextAttemptAt = null;
    await _attempt(initial: false);
  }

  Future<void> confirmStaleAndSend() async {
    _staleConfirmed = true;
    await trySend(manual: true);
  }

  /// The connection (or the app) is back: retry without waiting out the backoff.
  void connectivityRestored() {
    _nextAttemptAt = null;
    unawaited(trySend());
  }

  Future<void> discard() async {
    final userId = _userId;
    state = const OutboxState();
    _failures = 0;
    _nextAttemptAt = null;
    if (userId != null) await _storage.clearOutbox(userId);
  }

  void acknowledgeSent() {
    if (state.sentIncidentId != null) state = const OutboxState();
  }

  // ---------------------------------------------------------------------------
  // One attempt
  // ---------------------------------------------------------------------------

  Future<_Outcome> _attempt({required bool initial, bool quiet = false}) async {
    final start = state.report;
    if (start == null || _busy) return const _Skipped();
    _busy = true;

    var report = start;
    try {
      if (await isOffline()) {
        _scheduleRetry();
        return _Retry(report.incidentId);
      }
      state = OutboxState(report: report, phase: OutboxPhase.sending);

      // 1. Create the incident (skipped when an earlier attempt already did).
      if (report.incidentId == null) {
        report = report.copyWith(incidentId: await _createIncident(report));
        await _persist(report);
      }

      // The report is with dispatch. Tell the person NOW and send the photos / recordings in the background,
      // instead of keeping them on a spinner until every upload has finished (that was the extra wait).
      if (initial && report.remaining.isNotEmpty) {
        ref.invalidate(myIncidentsProvider);
        unawaited(
          Future.microtask(() => _attempt(initial: false, quiet: true)),
        );
        return _Retry(report.incidentId);
      }

      // 2. Upload the attachments, remembering each success.
      report = await _uploadAttachments(report);

      await _storage.clearOutbox(report.userId);
      ref.invalidate(myIncidentsProvider);
      final done = _Done(report.incidentId!, report.failedIds.length);
      // The person was already told "sent" when the report was created; only speak up if something was lost.
      state = (initial || (quiet && done.failedUploads == 0))
          ? const OutboxState()
          : OutboxState(
              sentIncidentId: done.incidentId,
              failedUploads: done.failedUploads,
            );
      _failures = 0;
      return done;
    } on _TransientFailure catch (failure) {
      _scheduleRetry(failure.reason);
      return _Retry(state.report?.incidentId ?? report.incidentId);
    } on ApiException catch (e) {
      if (_isTransient(e)) {
        _scheduleRetry(e.message);
        return _Retry(state.report?.incidentId ?? report.incidentId);
      }
      return _refuse(report, e.message, initial: initial);
    } catch (error) {
      // Unexpected (disk, parsing...): keep the report and try again later.
      debugPrint('[Outbox] Unexpected failure: $error');
      _scheduleRetry('$error');
      return _Retry(state.report?.incidentId ?? report.incidentId);
    } finally {
      _busy = false;
    }
  }

  /// Creates the incident, tolerating the "I already created it" case.
  Future<int> _createIncident(OutboxReport report) async {
    try {
      return (await ref.read(incidentRepositoryProvider).submit(report.request))
          .id;
    } on ApiException catch (e) {
      // With an idempotent backend a replay returns the original incident, so a
      // 409 means a *different* active report. Older backends answer a replay
      // with 409 too, so check whether that active report is actually ours.
      if (e.status != 409) rethrow;
      final ours = await _findOwnIncident(report);
      if (ours != null) return ours.id;
      rethrow;
    }
  }

  Future<Incident?> _findOwnIncident(OutboxReport report) async {
    final request = report.request;
    final earliest = report.capturedAt.subtract(const Duration(minutes: 5));

    for (final incident in await ref.read(incidentRepositoryProvider).mine()) {
      final sameReport =
          !incident.createdAt.isBefore(earliest) &&
          incident.category == request.category &&
          incident.status.isCancellableByCitizen &&
          distanceMeters(
                incident.latitude,
                incident.longitude,
                request.latitude,
                request.longitude,
              ) <=
              100;
      if (sameReport) return incident;
    }
    return null;
  }

  /// Uploads what is left, one attachment at a time, in three steps that each remember their result:
  /// slot -> file into storage -> register. A retry resumes at the failed step, so a file that is already
  /// in storage is never sent again and never registered twice.
  Future<OutboxReport> _uploadAttachments(OutboxReport start) async {
    var report = start;
    final media = ref.read(incidentMediaRepositoryProvider);

    for (final attachment in report.remaining) {
      if (!File(attachment.path).existsSync()) {
        report = report.copyWith(
          failedIds: {...report.failedIds, attachment.id},
        );
        await _persist(report);
        continue;
      }
      try {
        var storagePath = report.uploadedPaths[attachment.id];
        if (storagePath == null) {
          final slot = await media.requestSlot(
            incidentId: report.incidentId!,
            filePath: attachment.path,
          );
          await media.putFile(slot, attachment.path);
          storagePath = slot.path;
          // The file is in storage: remember that before anything else can go wrong.
          report = report.copyWith(
            uploadedPaths: {
              ...report.uploadedPaths,
              attachment.id: storagePath,
            },
          );
          await _persist(report);
        }
        await media.register(
          incidentId: report.incidentId!,
          kind: attachment.kind,
          storagePath: storagePath,
        );
        report = report.copyWith(
          uploadedIds: {...report.uploadedIds, attachment.id},
        );
      } on ApiException catch (e) {
        if (!_isTransient(e)) {
          // The server will never accept this file: give up on it, not on the report.
          report = report.copyWith(
            failedIds: {...report.failedIds, attachment.id},
          );
        } else {
          report = _countFailedAttempt(report, attachment);
          if (!report.failedIds.contains(attachment.id)) {
            await _persist(report);
            throw _TransientFailure(e.message);
          }
        }
      } catch (error) {
        // Not a network problem (a bug, a disk error...): retrying will not fix it, so give up on THIS
        // attachment right away instead of looping. The report is already with dispatch.
        debugPrint('[Outbox] Giving up on attachment ${attachment.id}: $error');
        report = report.copyWith(
          failedIds: {...report.failedIds, attachment.id},
        );
      }
      await _persist(report);
    }
    return report;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /// Connection trouble or a server-side hiccup: worth retrying. Anything else
  /// (validation, "already have an active report", ...) will not fix itself.
  bool _isTransient(ApiException e) =>
      e.isNetworkError || e.status >= 500 || e.status == 408;

  /// Records one failed upload of [attachment]; after [OutboxReport.maxUploadAttempts] it is given up on.
  OutboxReport _countFailedAttempt(
    OutboxReport report,
    PendingAttachment attachment,
  ) {
    final attempts = (report.uploadAttempts[attachment.id] ?? 0) + 1;
    return report.copyWith(
      uploadAttempts: {...report.uploadAttempts, attachment.id: attempts},
      failedIds: attempts >= OutboxReport.maxUploadAttempts
          ? {...report.failedIds, attachment.id}
          : report.failedIds,
    );
  }

  Future<void> _persist(OutboxReport report) async {
    await _storage.saveOutbox(report);
    if (ref.mounted) {
      state = OutboxState(report: report, phase: OutboxPhase.sending);
    }
  }

  void _scheduleRetry([String? reason]) {
    _failures++;
    // 30 s, 60 s, 120 s, 240 s, then capped at 5 minutes.
    final seconds = math.min(
      _baseDelay.inSeconds * (1 << math.min(_failures - 1, 4)),
      _maxDelay.inSeconds,
    );
    _nextAttemptAt = DateTime.now().add(Duration(seconds: seconds));
    final report = state.report;
    if (report != null && ref.mounted) {
      state = OutboxState(
        report: report,
        phase: OutboxPhase.waiting,
        error: reason,
      );
    }
  }

  Future<_Outcome> _refuse(
    OutboxReport report,
    String message, {
    required bool initial,
  }) async {
    if (initial) {
      // The form still holds everything; do not keep a report the server rejected.
      await _storage.clearOutbox(report.userId);
      if (ref.mounted) state = const OutboxState();
    } else if (ref.mounted) {
      state = OutboxState(
        report: report,
        phase: OutboxPhase.rejected,
        error: message,
      );
    }
    return _Refused(message);
  }
}

sealed class _Outcome {
  const _Outcome();
}

final class _Done extends _Outcome {
  const _Done(this.incidentId, this.failedUploads);

  final int incidentId;
  final int failedUploads;
}

final class _Retry extends _Outcome {
  const _Retry([this.incidentId]);

  /// Set once the server has created the incident (only attachments are left to send).
  final int? incidentId;
}

final class _Refused extends _Outcome {
  const _Refused(this.message);

  final String message;
}

final class _Skipped extends _Outcome {
  const _Skipped();
}

/// Thrown inside an upload loop to abandon this attempt but keep the report.
final class _TransientFailure implements Exception {
  const _TransientFailure([this.reason]);

  /// Why this attempt failed (shown on the home banner in test builds).
  final String? reason;
}
