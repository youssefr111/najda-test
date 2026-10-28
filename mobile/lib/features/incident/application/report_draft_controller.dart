import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/auth_controller.dart';
import '../data/report_storage.dart';
import '../domain/incident.dart';
import '../domain/incident_media.dart';
import '../domain/pending_attachment.dart';
import '../domain/report_draft.dart';

class ReportDraftState {
  const ReportDraftState({this.draft = const ReportDraft(), this.loaded = false, this.restored = false});

  final ReportDraft draft;

  /// The saved draft has been read from disk (until then the form must wait).
  final bool loaded;

  /// Something from a previous session was brought back.
  final bool restored;

  ReportDraftState copyWith({ReportDraft? draft, bool? restored}) =>
      ReportDraftState(draft: draft ?? this.draft, loaded: loaded, restored: restored ?? this.restored);
}

final reportDraftControllerProvider =
    NotifierProvider<ReportDraftController, ReportDraftState>(ReportDraftController.new);

/// Keeps the report form alive across reloads, crashes and lost connections by
/// saving it to disk shortly after every change -- the mobile counterpart of
/// the web app's draft + attachment persistence.
class ReportDraftController extends Notifier<ReportDraftState> {
  static const _saveDelay = Duration(milliseconds: 400);

  Timer? _timer;
  int? _userId;

  @override
  ReportDraftState build() {
    // Select the id/role only: a profile refresh must not reset a form that is
    // being typed into.
    final userId = ref.watch(currentUserProvider.select((user) => user?.id));
    final canFile = ref.watch(currentUserProvider.select((user) => user?.role.canFileReports ?? false));
    _userId = userId;

    ref.onDispose(() => _timer?.cancel());

    if (userId != null && canFile) Future.microtask(() => _load(userId));
    return const ReportDraftState();
  }

  Future<void> _load(int userId) async {
    final draft = await ref.read(reportStorageProvider).loadDraft(userId);
    if (!ref.mounted || _userId != userId) return;
    state = ReportDraftState(
      draft: draft ?? const ReportDraft(),
      loaded: true,
      restored: draft != null && !draft.isBlank,
    );
  }

  void update(ReportDraft Function(ReportDraft draft) change) {
    state = state.copyWith(draft: change(state.draft));
    _scheduleSave();
  }

  void setCategory(IncidentCategory category) => update((d) => d.copyWith(category: category));

  Future<void> addAttachment({required MediaKind kind, required String sourcePath, Duration? duration}) async {
    final userId = _userId;
    if (userId == null) return;

    final path = await ref.read(reportStorageProvider).adoptIntoDraft(userId, sourcePath);
    if (!ref.mounted) return;

    final attachment = PendingAttachment(
      id: '${DateTime.now().microsecondsSinceEpoch}',
      kind: kind,
      path: path,
      duration: duration,
    );
    update((d) => d.copyWith(attachments: [...d.attachments, attachment]));
  }

  Future<void> removeAttachment(String id) async {
    final target = state.draft.attachments.where((a) => a.id == id).firstOrNull;
    if (target == null) return;
    update((d) => d.copyWith(attachments: [for (final a in d.attachments) if (a.id != id) a]));
    await ref.read(reportStorageProvider).deleteFile(target.path);
  }

  /// Empties the form and deletes everything stored for it.
  Future<void> clear() async {
    _timer?.cancel();
    state = const ReportDraftState(loaded: true);
    final userId = _userId;
    if (userId != null) await ref.read(reportStorageProvider).clearDraft(userId);
  }

  void _scheduleSave() {
    _timer?.cancel();
    final userId = _userId;
    if (userId == null) return;

    final storage = ref.read(reportStorageProvider);
    _timer = Timer(_saveDelay, () {
      final draft = state.draft;
      // Only a form identical to a fresh one is deleted; a lone category change is kept.
      unawaited(draft.isPristine ? storage.clearDraft(userId) : storage.saveDraft(userId, draft));
    });
  }
}
