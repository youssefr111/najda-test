import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/update/app_update.dart';

/// Keeps the "is there a newer version?" answer fresh. It never interrupts anything: the answer is shown by the
/// update banner on the home screens and the "Update available" tile in Settings.
///
/// The check runs once at launch. Without this it would stay as it was for the whole session, so an app opened
/// offline (or while the backend was waking up) would never learn about an update until it was restarted.
class UpdateNotifier extends ConsumerStatefulWidget {
  const UpdateNotifier({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<UpdateNotifier> createState() => _UpdateNotifierState();
}

class _UpdateNotifierState extends ConsumerState<UpdateNotifier>
    with WidgetsBindingObserver {
  /// Coming back to the app checks again when the last check is older than this. The backend caches its own answer,
  /// so this is cheap.
  static const _staleAfter = Duration(minutes: 30);

  DateTime _lastCheck = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    if (DateTime.now().difference(_lastCheck) < _staleAfter) return;
    _lastCheck = DateTime.now();
    ref.invalidate(availableUpdateProvider);
  }

  @override
  Widget build(BuildContext context) {
    // Listening keeps the provider alive and starts the first check at launch.
    ref.listen(availableUpdateProvider, (_, _) {});
    return widget.child;
  }
}