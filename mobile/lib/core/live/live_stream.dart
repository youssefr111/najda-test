import 'dart:async';

import 'stomp_hub.dart';

/// Fetches immediately, then again whenever the backend publishes on any of
/// [topics] -- the app's replacement for polling.
///
/// Event bursts collapse into one refetch ([debounce]); a reconnect refetches
/// to catch up on anything missed offline; and a slow [safetyNet] refetch keeps
/// the data correct even if a push is lost. A failed fetch becomes an error
/// event and the stream keeps going.
Stream<T> liveStream<T>({
  required StompHub hub,
  required List<String> topics,
  required Future<T> Function() fetch,
  Duration safetyNet = const Duration(seconds: 45),
  Duration debounce = const Duration(milliseconds: 250),
}) {
  late final StreamController<T> controller;
  final subscriptions = <StreamSubscription<dynamic>>[];
  Timer? debounceTimer;
  Timer? safetyTimer;

  Future<void> load() async {
    if (controller.isClosed) return;
    try {
      final value = await fetch();
      if (!controller.isClosed) controller.add(value);
    } catch (error, stackTrace) {
      if (!controller.isClosed) controller.addError(error, stackTrace);
    }
  }

  void schedule() {
    debounceTimer?.cancel();
    debounceTimer = Timer(debounce, () => unawaited(load()));
  }

  controller = StreamController<T>(
    onListen: () {
      unawaited(load());
      for (final topic in topics) {
        subscriptions.add(hub.topic(topic).listen((_) => schedule()));
      }
      subscriptions.add(hub.reconnected.listen((_) => schedule()));
      safetyTimer = Timer.periodic(safetyNet, (_) => unawaited(load()));
    },
    onCancel: () async {
      debounceTimer?.cancel();
      safetyTimer?.cancel();
      for (final subscription in subscriptions) {
        await subscription.cancel();
      }
      await controller.close();
    },
  );
  return controller.stream;
}
