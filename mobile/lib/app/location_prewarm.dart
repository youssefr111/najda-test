import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/location/location_providers.dart';
import '../core/location/location_sharing.dart';
import '../features/auth/application/auth_controller.dart';

/// Warms up the GPS as soon as someone who can report (citizen or responder) is signed in, so an SOS gets a fix
/// quickly -- unless they switched location sharing off in Settings.
class LocationPrewarm extends ConsumerWidget {
  const LocationPrewarm({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    if (user != null && user.role.canFileReports && ref.watch(locationSharingProvider)) {
      ref.watch(locationPrepProvider);
    }
    return child;
  }
}
