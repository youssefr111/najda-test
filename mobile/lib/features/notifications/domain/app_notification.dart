/// One entry of the notification inbox, as stored by the backend.
///
/// The backend writes every notification in all supported languages, so the
/// text shown always follows the app's current language -- including old
/// entries after a language switch.
class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.data,
    required this.createdAt,
    required this.read,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: (json['id'] as num).toInt(),
        type: json['type'] as String,
        title: _strings(json['title']),
        body: _strings(json['body']),
        data: _strings(json['data']),
        createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
        read: json['read'] as bool? ?? false,
      );

  /// e.g. `MISSION_OFFERED`, `INCIDENT_ARRIVED`, `CHAT_MESSAGE`.
  final String type;
  final int id;
  final Map<String, String> title;
  final Map<String, String> body;

  /// `incidentId`, `missionId`, ... : what is needed to open the right screen.
  final Map<String, String> data;
  final DateTime createdAt;
  final bool read;

  String titleFor(String languageCode) => _pick(title, languageCode);
  String bodyFor(String languageCode) => _pick(body, languageCode);

  AppNotification markedRead() => AppNotification(
    id: id,
    type: type,
    title: title,
    body: body,
    data: data,
    createdAt: createdAt,
    read: true,
  );

  static String _pick(Map<String, String> text, String languageCode) =>
      text[languageCode] ?? text['en'] ?? text.values.firstOrNull ?? '';

  static Map<String, String> _strings(Object? raw) => raw is Map
      ? {for (final e in raw.entries) '${e.key}': '${e.value}'}
      : const {};
}

/// A page of notifications, newest first.
class NotificationPage {
  const NotificationPage({
    required this.items,
    required this.nextBefore,
    required this.unreadCount,
  });

  factory NotificationPage.fromJson(Map<String, dynamic> json) =>
      NotificationPage(
        items: [
          for (final item in (json['items'] as List<dynamic>? ?? const []))
            AppNotification.fromJson(Map<String, dynamic>.from(item as Map)),
        ],
        nextBefore: (json['nextBefore'] as num?)?.toInt(),
        unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      );

  final List<AppNotification> items;

  /// Pass as `before` to get the next (older) page; `null` = no more.
  final int? nextBefore;
  final int unreadCount;
}
