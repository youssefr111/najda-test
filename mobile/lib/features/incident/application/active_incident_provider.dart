import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/incident.dart';
import 'incident_providers.dart';

/// The citizen's current unfinished report (newest first), or `null`.
///
/// Derived from the live "my reports" stream rather than a locally stored id,
/// so it is correct after a reinstall, on a second device, and when dispatch
/// closes or cancels the report from the web console.
final activeIncidentProvider = Provider.autoDispose<Incident?>((ref) {
  final incidents = ref.watch(myIncidentsProvider).value;
  if (incidents == null) return null;

  final active =
      incidents
          .where((incident) => incident.status.isCancellableByCitizen)
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return active.firstOrNull;
});
