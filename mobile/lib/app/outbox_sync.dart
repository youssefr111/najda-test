import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/application/auth_controller.dart';
import '../features/incident/application/outbox_controller.dart';

/// Drives the report outbox: retries a saved report when the connection comes
/// back, when the app returns to the foreground, and every 30 seconds while
/// anything is waiting. The controller applies its own backoff and offline
/// checks, so these triggers can be generous.
class OutboxSync extends ConsumerStatefulWidget {
  const OutboxSync({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<OutboxSync> createState() => _OutboxSyncState();
}

class _OutboxSyncState extends ConsumerState<OutboxSync> with WidgetsBindingObserver {
  StreamSubscription<List<ConnectivityResult>>? _connectivity;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _connectivity = Connectivity().onConnectivityChanged.listen((results) {
      if (results.any((r) => r != ConnectivityResult.none)) _restored();
    });
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _retry());
  }

  bool get _isCitizen => ref.read(currentUserProvider)?.role.canFileReports ?? false;

  void _restored() {
    if (_isCitizen) ref.read(outboxControllerProvider.notifier).connectivityRestored();
  }

  void _retry() {
    if (_isCitizen) unawaited(ref.read(outboxControllerProvider.notifier).trySend());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _restored();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_connectivity?.cancel());
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Keeps the controller mounted (and loading any saved report) for citizens.
    final isCitizen = ref.watch(currentUserProvider.select((user) => user?.role.canFileReports ?? false));
    if (isCitizen) ref.watch(outboxControllerProvider.select((state) => state.hasReport));
    return widget.child;
  }
}
