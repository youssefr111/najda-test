import 'package:flutter_test/flutter_test.dart';
import 'package:najda/core/push/notification_routes.dart';
import 'package:najda/features/auth/domain/role.dart';
import 'package:najda/features/notifications/domain/app_notification.dart';

void main() {
  group('AppNotification', () {
    final json = {
      'id': 7,
      'type': 'MISSION_OFFERED',
      'title': {'en': 'New mission', 'ar': 'مهمة جديدة'},
      'body': {'en': 'Open the app', 'ar': 'افتح التطبيق'},
      'data': {'incidentId': '42', 'missionId': '9'},
      'createdAt': '2026-10-15T10:00:00Z',
      'read': false,
    };

    test('parses the backend payload', () {
      final n = AppNotification.fromJson(json);
      expect(n.id, 7);
      expect(n.type, 'MISSION_OFFERED');
      expect(n.data['missionId'], '9');
      expect(n.read, isFalse);
    });

    test('text follows the app language and falls back to English', () {
      final n = AppNotification.fromJson(json);
      expect(n.titleFor('ar'), 'مهمة جديدة');
      expect(n.titleFor('en'), 'New mission');
      expect(n.titleFor('fr'), 'New mission');
    });

    test('markedRead keeps everything else', () {
      final n = AppNotification.fromJson(json).markedRead();
      expect(n.read, isTrue);
      expect(n.id, 7);
    });
  });

  group('NotificationPage', () {
    test('parses items, cursor and unread count', () {
      final page = NotificationPage.fromJson({
        'items': [
          {
            'id': 3,
            'type': 'CHAT_MESSAGE',
            'title': {'en': 'a'},
            'body': {'en': 'b'},
            'data': <String, String>{},
            'createdAt': '2026-10-15T10:00:00Z',
            'read': true,
          },
        ],
        'nextBefore': 3,
        'unreadCount': 5,
      });
      expect(page.items.single.read, isTrue);
      expect(page.nextBefore, 3);
      expect(page.unreadCount, 5);
    });
  });

  group('notificationRoute', () {
    test('a mission offer opens the mission for a responder', () {
      expect(
        notificationRoute(type: 'MISSION_OFFERED', data: {'missionId': '9', 'incidentId': '42'}, role: Role.ambulanceCrew),
        '/responder/missions/9',
      );
    });

    test('citizen progress updates open their report', () {
      for (final type in ['INCIDENT_ACCEPTED', 'INCIDENT_EN_ROUTE', 'INCIDENT_ARRIVED', 'INCIDENT_RESOLVED']) {
        expect(notificationRoute(type: type, data: {'incidentId': '42'}, role: Role.citizen), '/citizen/incident/42');
      }
    });

    test('chat goes to the report for a citizen and home for a responder', () {
      expect(notificationRoute(type: 'CHAT_MESSAGE', data: {'incidentId': '42'}, role: Role.citizen), '/citizen/incident/42');
      expect(notificationRoute(type: 'CHAT_MESSAGE', data: {'incidentId': '42'}, role: Role.police), '/responder');
    });

    test('desk roles and unknown types fall back to the inbox', () {
      expect(notificationRoute(type: 'INCIDENT_NEW', data: {'incidentId': '1'}, role: Role.dispatcher), '/notifications');
      expect(notificationRoute(type: 'SOMETHING_NEW', data: const {}, role: Role.citizen), '/notifications');
    });

    test('a missing id never produces a broken route', () {
      expect(notificationRoute(type: 'MISSION_OFFERED', data: const {}, role: Role.firefighter), '/responder');
      expect(notificationRoute(type: 'INCIDENT_ARRIVED', data: const {}, role: Role.citizen), '/notifications');
    });
  });
}
