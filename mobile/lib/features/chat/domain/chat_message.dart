import '../../../core/network/json.dart';

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.senderRole,
    required this.content,
    required this.sentAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as int,
    senderId: json['senderId'] as int,
    senderName: json['senderName'] as String? ?? '',
    senderRole: json['senderRole'] as String? ?? '',
    content: json['content'] as String? ?? '',
    sentAt: parseDate(json['sentAt']),
  );

  final int id;
  final int senderId;
  final String senderName;

  /// Backend role name, e.g. `CITIZEN` / `AMBULANCE_CREW`.
  final String senderRole;
  final String content;
  final DateTime sentAt;
}
