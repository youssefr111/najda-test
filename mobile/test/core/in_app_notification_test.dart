import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:najda/core/widgets/in_app_notification.dart';

void main() {
  late ProviderContainer container;
  late InAppNotificationController controller;

  setUp(() {
    container = ProviderContainer();
    controller = container.read(inAppNotificationProvider.notifier);
  });

  tearDown(() => container.dispose());

  test('starts with nothing to show', () {
    expect(container.read(inAppNotificationProvider), isNull);
  });

  test('shows a notification and closes it', () {
    controller.show(title: 'Mission offered', body: 'Unit 4');
    final shown = container.read(inAppNotificationProvider)!;
    expect(shown.title, 'Mission offered');
    expect(shown.body, 'Unit 4');

    controller.dismiss(shown.id);
    expect(container.read(inAppNotificationProvider), isNull);
  });

  test('a newer notification replaces the one on screen', () {
    controller.show(title: 'first');
    final first = container.read(inAppNotificationProvider)!;
    controller.show(title: 'second');
    final second = container.read(inAppNotificationProvider)!;

    expect(second.title, 'second');
    expect(second.id, isNot(first.id));
  });

  test('closing a notification that was already replaced does not close the new one', () {
    controller.show(title: 'first');
    final first = container.read(inAppNotificationProvider)!;
    controller.show(title: 'second');

    controller.dismiss(first.id); // e.g. the old card's timer firing late

    expect(container.read(inAppNotificationProvider)?.title, 'second');
  });
}