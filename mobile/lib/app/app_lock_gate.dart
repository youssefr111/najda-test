import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/security/app_lock.dart';
import '../core/security/lock_screen.dart';

/// Puts the [LockScreen] over the whole app while it is locked, and tells the
/// lock when the app leaves / returns to the foreground. The app underneath
/// keeps its state, so unlocking returns exactly where the person was.
class AppLockGate extends ConsumerStatefulWidget {
  const AppLockGate({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends ConsumerState<AppLockGate>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final lock = ref.read(appLockProvider.notifier);
    if (state == AppLifecycleState.paused) {
      lock.onBackgrounded();
    } else if (state == AppLifecycleState.resumed) {
      lock.onResumed();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locked = ref.watch(appLockProvider);
    return Stack(
      children: [
        Positioned.fill(child: widget.child),
        if (locked) const Positioned.fill(child: LockScreen()),
      ],
    );
  }
}
