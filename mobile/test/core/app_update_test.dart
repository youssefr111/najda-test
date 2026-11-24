import 'package:flutter_test/flutter_test.dart';
import 'package:najda/core/update/app_update.dart';

void main() {
  group('compareVersions', () {
    test('orders dotted versions numerically', () {
      expect(compareVersions('1.10.0', '1.9.0'), greaterThan(0));
      expect(compareVersions('1.2.0', '1.2.0'), 0);
      expect(compareVersions('1.2', '1.2.0'), 0);
      expect(compareVersions('v2.0.0', '1.9.9'), greaterThan(0));
    });

    test('is null when a side is not a version', () {
      expect(compareVersions('nightly', '1.0.0'), isNull);
    });
  });

  group('trustedApkUrl', () {
    test('accepts GitHub release downloads', () {
      final url = trustedApkUrl('https://github.com/o/r/releases/download/v1.2.0/najda-v1.2.0-build142.apk');
      expect(url, isNotNull);
      expect(url!.host, 'github.com');
      expect(trustedApkUrl('https://objects.githubusercontent.com/some/object.apk'), isNotNull);
    });

    test('refuses anything else', () {
      expect(trustedApkUrl(null), isNull);
      expect(trustedApkUrl(42), isNull);
      expect(trustedApkUrl('http://github.com/o/r/a.apk'), isNull);
      expect(trustedApkUrl('https://example.com/a.apk'), isNull);
      expect(trustedApkUrl('https://github.com.evil.com/a.apk'), isNull);
    });
  });

  group('AvailableUpdate.sizeMb', () {
    final destination = Uri.parse('https://github.com/o/r/a.apk');

    test('rounds up to whole megabytes', () {
      expect(AvailableUpdate(version: '1.0.0', destination: destination, sizeBytes: 41 * 1024 * 1024 + 1).sizeMb, 42);
    });

    test('is null when the size is unknown', () {
      expect(AvailableUpdate(version: '1.0.0', destination: destination).sizeMb, isNull);
    });
  });
}