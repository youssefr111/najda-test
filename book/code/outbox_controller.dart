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
