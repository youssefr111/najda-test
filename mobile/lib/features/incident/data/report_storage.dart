import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../domain/outbox_report.dart';
import '../domain/pending_attachment.dart';
import '../domain/report_draft.dart';

final reportStorageProvider = Provider<ReportStorage>((ref) => ReportStorage());

/// Durable, per-user storage for the report being written (the draft) and the
/// report waiting to be sent (the outbox), including their photos, videos and
/// recordings.
///
/// Everything lives under the app's own support directory -- never the OS cache
/// -- so nothing disappears when the system frees space or the app restarts.
/// JSON is written atomically (temp file + rename) so a crash mid-write can
/// never leave a half-written, unreadable file.
class ReportStorage {
  Directory? _support;

  Future<Directory> _userDir(int userId) async {
    final support = _support ??= await getApplicationSupportDirectory();
    final dir = Directory('${support.path}/reports/$userId');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  Future<Directory> _mediaDir(int userId, String scope) async {
    final dir = Directory('${(await _userDir(userId)).path}/$scope');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  Future<File> _jsonFile(int userId, String name) async =>
      File('${(await _userDir(userId)).path}/$name.json');

  // ---------------------------------------------------------------------------
  // Draft
  // ---------------------------------------------------------------------------

  Future<ReportDraft?> loadDraft(int userId) async {
    final json = await _readJson(await _jsonFile(userId, 'draft'));
    if (json == null) return null;
    try {
      final draft = ReportDraft.fromJson(json);
      // Files the OS removed behind our back are dropped rather than shown broken.
      return draft.copyWith(
        attachments: [
          for (final a in draft.attachments)
            if (File(a.path).existsSync()) a,
        ],
      );
    } catch (e) {
      debugPrint('[ReportStorage] Unreadable draft discarded: $e');
      await clearDraft(userId);
      return null;
    }
  }

  Future<void> saveDraft(int userId, ReportDraft draft) async =>
      _writeJson(await _jsonFile(userId, 'draft'), draft.toJson());

  /// Deletes the draft and its media.
  Future<void> clearDraft(int userId) async {
    await _deleteIfExists(await _jsonFile(userId, 'draft'));
    await _deleteDir(await _mediaDir(userId, 'draft'));
  }

  /// Copies a freshly captured / picked file into the draft's own folder and
  /// returns its permanent path. Temporary originals (camera cache, our own
  /// recordings) are removed once copied; files elsewhere are never touched.
  Future<String> adoptIntoDraft(int userId, String sourcePath) async {
    final dir = await _mediaDir(userId, 'draft');
    final name = sourcePath.split(RegExp(r'[\\/]')).last;
    final target = File(
      '${dir.path}/${DateTime.now().microsecondsSinceEpoch}_$name',
    );
    await File(sourcePath).copy(target.path);

    final temp = await getTemporaryDirectory();
    if (sourcePath.startsWith(temp.path)) {
      await _deleteIfExists(File(sourcePath));
    }
    return target.path;
  }

  Future<void> deleteFile(String path) => _deleteIfExists(File(path));

  // ---------------------------------------------------------------------------
  // Outbox
  // ---------------------------------------------------------------------------

  Future<OutboxReport?> loadOutbox(int userId) async {
    final json = await _readJson(await _jsonFile(userId, 'outbox'));
    if (json == null) return null;
    try {
      final report = OutboxReport.fromJson(json);
      // A report is never dropped for a missing attachment: that file is simply
      // marked as failed so the report itself still goes out.
      final missing = {
        for (final a in report.attachments)
          if (!File(a.path).existsSync()) a.id,
      };
      return missing.isEmpty
          ? report
          : report.copyWith(failedIds: {...report.failedIds, ...missing});
    } catch (e) {
      debugPrint('[ReportStorage] Unreadable outbox discarded: $e');
      await clearOutbox(userId);
      return null;
    }
  }

  Future<void> saveOutbox(OutboxReport report) async =>
      _writeJson(await _jsonFile(report.userId, 'outbox'), report.toJson());

  Future<void> clearOutbox(int userId) async {
    await _deleteIfExists(await _jsonFile(userId, 'outbox'));
    await _deleteDir(await _mediaDir(userId, 'outbox'));
  }

  /// Copies the draft's attachments into the outbox folder (copy, not move: if
  /// the server turns the report down, the draft must still be intact).
  Future<List<PendingAttachment>> copyToOutbox(
    int userId,
    List<PendingAttachment> attachments,
  ) async {
    final dir = await _mediaDir(userId, 'outbox');
    final copies = <PendingAttachment>[];
    for (final attachment in attachments) {
      final source = File(attachment.path);
      if (!await source.exists()) continue;
      final name = attachment.path.split(RegExp(r'[\\/]')).last;
      final target = File('${dir.path}/${attachment.id}_$name');
      await source.copy(target.path);
      copies.add(attachment.copyWith(path: target.path));
    }
    return copies;
  }

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>?> _readJson(File file) async {
    try {
      if (!await file.exists()) return null;
      final decoded = jsonDecode(await file.readAsString());
      return decoded is Map ? Map<String, dynamic>.from(decoded) : null;
    } catch (e) {
      debugPrint('[ReportStorage] Corrupt ${file.path}: $e');
      await _deleteIfExists(file);
      return null;
    }
  }

  Future<void> _writeJson(File file, Map<String, Object?> data) async {
    final temp = File('${file.path}.tmp');
    await temp.writeAsString(jsonEncode(data), flush: true);
    await temp.rename(file.path);
  }

  Future<void> _deleteIfExists(File file) async {
    try {
      if (await file.exists()) await file.delete();
    } catch (_) {
      // Best effort: a leftover file is harmless, a thrown error here is not.
    }
  }

  Future<void> _deleteDir(Directory dir) async {
    try {
      if (await dir.exists()) await dir.delete(recursive: true);
    } catch (_) {}
  }
}
