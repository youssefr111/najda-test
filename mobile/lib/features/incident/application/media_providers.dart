import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/incident_media_repository.dart';

/// Signed download link for one media item. Kept alive for a while so scrolling
/// back to a thumbnail does not mint a new link, but well inside the link's own
/// expiry.
final mediaDownloadUrlProvider = FutureProvider.autoDispose.family<String, int>(
  (ref, mediaId) async {
    final link = ref.keepAlive();
    final timer = Timer(const Duration(minutes: 20), link.close);
    ref.onDispose(timer.cancel);
    return ref.watch(incidentMediaRepositoryProvider).downloadUrl(mediaId);
  },
);
