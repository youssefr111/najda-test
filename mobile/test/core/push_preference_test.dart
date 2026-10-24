import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:najda/core/push/push_notifications.dart';
import 'package:najda/core/storage/preferences.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakePush implements PushNotificationService {
  _FakePush({this.enableResult = PushEnableResult.enabled, this.failing = false});

  final PushEnableResult enableResult;
  final bool failing;
  final calls = <String>[];

  @override
  bool get isDeliveryAvailable => true;

  @override
  Future<PushEnableResult> enable() async {
    calls.add('enable');
    if (failing) throw StateError('offline');
    return enableResult;
  }

  @override
  Future<void> disable() async {
    calls.add('disable');
    if (failing) throw StateError('offline');
  }

  @override
  Future<void> unregisterDevice() async => calls.add('unregister');
}

Future<ProviderContainer> _container(PushNotificationService service) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      pushNotificationServiceProvider.overrideWithValue(service),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  test('push notifications default to on', () async {
    final container = await _container(_FakePush());
    expect(container.read(pushNotificationsEnabledProvider), isTrue);
  });

  test('toggling saves the choice and applies it through the service', () async {
    final service = _FakePush();
    final container = await _container(service);
    final notifier = container.read(pushNotificationsEnabledProvider.notifier);

    await notifier.setEnabled(enabled: false);
    expect(container.read(pushNotificationsEnabledProvider), isFalse);
    expect(container.read(sharedPreferencesProvider).getBool(PrefKeys.pushNotifications), isFalse);

    await notifier.setEnabled(enabled: true);
    expect(container.read(pushNotificationsEnabledProvider), isTrue);
    expect(service.calls, ['disable', 'enable']);
  });

  test('a blocked OS permission keeps the switch off and reports why', () async {
    final container = await _container(_FakePush(enableResult: PushEnableResult.permissionDenied));
    final result = await container.read(pushNotificationsEnabledProvider.notifier).setEnabled(enabled: true);

    expect(result, PushEnableResult.permissionDenied);
    expect(container.read(pushNotificationsEnabledProvider), isFalse);
    expect(container.read(sharedPreferencesProvider).getBool(PrefKeys.pushNotifications), isFalse);
  });

  test('a failing service (offline) still saves the choice', () async {
    final container = await _container(_FakePush(failing: true));
    await container.read(pushNotificationsEnabledProvider.notifier).setEnabled(enabled: false);

    expect(container.read(pushNotificationsEnabledProvider), isFalse);
    expect(container.read(sharedPreferencesProvider).getBool(PrefKeys.pushNotifications), isFalse);
  });
}
