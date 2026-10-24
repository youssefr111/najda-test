import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/l10n/l10n_x.dart';
import '../core/storage/preferences.dart';
import '../core/update/app_update.dart';
import '../core/widgets/root_messenger.dart';

/// Tells the person once per release that a newer version exists. Never blocks
/// anything: the persistent entry point is the "Update available" tile in Settings.
class UpdateNotifier extends ConsumerStatefulWidget {
  const UpdateNotifier({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<UpdateNotifier> createState() => _UpdateNotifierState();
}

class _UpdateNotifierState extends ConsumerState<UpdateNotifier> {
  void _announce(AvailableUpdate update) {
    final prefs = ref.read(sharedPreferencesProvider);
    if (prefs.getString(PrefKeys.updateAnnouncedVersion) == update.version) return;

    final messenger = ref.read(rootMessengerKeyProvider).currentState;
    if (messenger == null) return;

    final l10n = context.l10n;
    prefs.setString(PrefKeys.updateAnnouncedVersion, update.version);
    messenger.showSnackBar(
      SnackBar(
        content: Text(l10n.updateAvailableMessage(update.version)),
        duration: const Duration(seconds: 12),
        action: SnackBarAction(label: l10n.updateAction, onPressed: () => openUpdate(update)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(availableUpdateProvider, (_, next) {
      final update = next.value;
      if (update != null) _announce(update);
    });
    return widget.child;
  }
}