import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/foundation.dart';
import '../config/flavor.dart';
import '../network/api_client.dart';
import '../widgets/app_version_label.dart' show packageInfoProvider;

const _playStoreInstaller = 'com.android.vending';

/// A release newer than the installed app, and where the person should go to get it.
class AvailableUpdate {
  const AvailableUpdate({required this.version, required this.destination, this.sizeBytes});

  /// Shown to the person: `1.2.0`, or `1.0.0 (142)` when it is a rebuild of the installed version.
  final String version;

  /// What "Update" opens: the APK itself for a sideloaded Android install (the browser starts downloading it right
  /// away), the Play Store page for a Play install, otherwise the release page.
  final Uri destination;

  /// Size of the APK download, when [destination] is the APK and the backend said so.
  final int? sizeBytes;

  /// [sizeBytes] in whole megabytes, rounded up.
  int? get sizeMb => sizeBytes == null ? null : (sizeBytes! / (1024 * 1024)).ceil();
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

/// The APK download link from the backend, only when it is an https link to GitHub's release downloads: nothing
/// else is ever opened as an "update". Android still verifies the APK's signature before it installs it.
@visibleForTesting
Uri? trustedApkUrl(Object? raw) {
  if (raw is! String) return null;
  final uri = Uri.tryParse(raw);
  if (uri == null || uri.scheme != 'https') return null;
  final host = uri.host;
  return host == 'github.com' || host.endsWith('.githubusercontent.com') ? uri : null;
}

/// The newest release the backend knows about, or `null` when it knows none
/// or cannot be reached: an update check must never disturb the app.
Future<({String version, int? build, Uri releaseUrl, Uri? apkUrl, int? apkSize})?> _fetchLatest(
  ApiClient api,
  String channel,
) async {
  try {
    final json = await api.get(
      '/api/app/version',
      query: {'channel': channel},
      timeout: const Duration(seconds: 8),
    );
    if (json is! Map<String, dynamic>) return null; // 204: nothing known yet

    final version = json['latestVersion'];
    final build = json['latestBuild'];
    final releaseUrl = Uri.tryParse('${json['releaseUrl']}');
    if (version is! String || releaseUrl == null || releaseUrl.scheme != 'https') return null;
    final apkSize = json['apkSize'];
    return (
      version: version,
      build: build is int ? build : null,
      releaseUrl: releaseUrl,
      apkUrl: trustedApkUrl(json['apkUrl']),
      apkSize: apkSize is int && apkSize > 0 ? apkSize : null,
    );
  } on Exception {
    return null;
  }
}

/// `null` when the app is up to date, the check failed, or this flavor has no release channel (local builds).
final availableUpdateProvider = FutureProvider<AvailableUpdate?>((ref) async {
  final channel = Flavor.current.releaseChannel;
  if (channel == null) return null;

  final info = await ref.watch(packageInfoProvider.future);
  final latest = await _fetchLatest(ref.read(apiClientProvider), channel);
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

  // A sideloaded Android install is sent straight to the APK, so tapping "Update" starts the download like the web's
  // download button. Everything else (Play, other platforms, an older backend without the link) keeps its page.
  final apk = !installedFromPlay && defaultTargetPlatform == TargetPlatform.android ? latest.apkUrl : null;

  return AvailableUpdate(
    version: isRebuild ? '${latest.version} (${latest.build})' : latest.version,
    destination: installedFromPlay
        ? Uri.https('play.google.com', '/store/apps/details', {'id': info.packageName})
        : (apk ?? latest.releaseUrl),
    sizeBytes: apk == null ? null : latest.apkSize,
  );
});

Future<void> openUpdate(AvailableUpdate update) =>
    launchUrl(update.destination, mode: LaunchMode.externalApplication);