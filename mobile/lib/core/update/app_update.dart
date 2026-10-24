import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/flavor.dart';
import '../network/api_client.dart';
import '../widgets/app_version_label.dart' show packageInfoProvider;

const _playStoreInstaller = 'com.android.vending';

/// A release newer than the installed app, and where the person should go to get it.
class AvailableUpdate {
  const AvailableUpdate({required this.version, required this.destination});

  /// Shown to the person: `1.2.0`, or `1.0.0 (142)` when it is a rebuild of the installed version.
  final String version;
  final Uri destination;
}

/// Orders two dotted versions like [Comparable.compareTo] (negative, zero, positive); `null` when either side is not
/// a version. A leading `v` and any `-suffix` / `+build` part are ignored.
int? compareVersions(String a, String b) {
  final x = _parse(a);
  final y = _parse(b);
  if (x == null || y == null) return null;

  for (var i = 0; i < math.max(x.length, y.length); i++) {
    final left = i < x.length ? x[i] : 0;
    final right = i < y.length ? y[i] : 0;
    if (left != right) return left.compareTo(right);
  }
  return 0;
}

List<int>? _parse(String raw) {
  final core = raw.trim().replaceFirst(RegExp('^[vV]'), '').split(RegExp('[-+]')).first;
  final parts = core.split('.').map(int.tryParse).toList();
  if (parts.isEmpty || parts.contains(null)) return null;
  return parts.cast<int>();
}

/// The newest release the backend knows about, or `null` when it knows none
/// or cannot be reached: an update check must never disturb the app.
Future<({String version, int? build, Uri releaseUrl})?> _fetchLatest(ApiClient api) async {
  try {
    final json = await api.get('/api/app/version', timeout: const Duration(seconds: 8));
    if (json is! Map<String, dynamic>) return null; // 204: nothing known yet

    final version = json['latestVersion'];
    final build = json['latestBuild'];
    final releaseUrl = Uri.tryParse('${json['releaseUrl']}');
    if (version is! String || releaseUrl == null || releaseUrl.scheme != 'https') return null;
    return (version: version, build: build is int ? build : null, releaseUrl: releaseUrl);
  } on Exception {
    return null;
  }
}

/// `null` when the app is up to date, the check failed, or this is not a production build.
final availableUpdateProvider = FutureProvider<AvailableUpdate?>((ref) async {
  if (!Flavor.current.isProduction) return null;

  final info = await ref.watch(packageInfoProvider.future);
  final latest = await _fetchLatest(ref.read(apiClientProvider));
  if (latest == null) return null;

  final order = compareVersions(latest.version, info.version);
  if (order == null || order < 0) return null;

  final installedFromPlay = info.installerStore == _playStoreInstaller;

  // Same version number: only a different build of it counts. Play installs are skipped here because Play assigns its
  // own build numbers, which say nothing about the APK published on GitHub.
  final installedBuild = int.tryParse(info.buildNumber);
  final isRebuild = order == 0 &&
      !installedFromPlay &&
      latest.build != null &&
      installedBuild != null &&
      latest.build! > installedBuild;
  if (order == 0 && !isRebuild) return null;

  return AvailableUpdate(
    version: isRebuild ? '${latest.version} (${latest.build})' : latest.version,
    destination: installedFromPlay
        ? Uri.https('play.google.com', '/store/apps/details', {'id': info.packageName})
        : latest.releaseUrl,
  );
});

Future<void> openUpdate(AvailableUpdate update) =>
    launchUrl(update.destination, mode: LaunchMode.externalApplication);