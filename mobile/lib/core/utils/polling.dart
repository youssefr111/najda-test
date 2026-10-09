import 'dart:async';

/// Emits `fetch()` immediately and then every [interval] while the stream has
/// a listener. A failed fetch becomes an error event; polling continues, so a
/// transient network blip recovers on the next tick (same behaviour as
/// TanStack Query's `refetchInterval`).
Stream<T> pollingStream<T>(Duration interval, Future<T> Function() fetch) {
  late final StreamController<T> controller;
  Timer? timer;

  Future<void> tick() async {
    if (controller.isClosed) return;
    try {
      final value = await fetch();
      if (!controller.isClosed) controller.add(value);
    } catch (error, stackTrace) {
      if (!controller.isClosed) controller.addError(error, stackTrace);
    }
  }

  controller = StreamController<T>(
    onListen: () {
      unawaited(tick());
      timer = Timer.periodic(interval, (_) => unawaited(tick()));
    },
    onCancel: () {
      timer?.cancel();
      return controller.close();
    },
  );
  return controller.stream;
}
