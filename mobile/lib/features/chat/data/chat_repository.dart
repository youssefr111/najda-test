import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/json.dart';
import '../domain/chat_message.dart';

final chatRepositoryProvider = Provider<ChatRepository>(
  (ref) => ChatRepository(ref.watch(apiClientProvider)),
);

class ChatRepository {
  const ChatRepository(this._api);

  final ApiClient _api;

  Future<List<ChatMessage>> messages(int incidentId) async => asJsonList(
    await _api.get('/api/incidents/$incidentId/chat'),
  ).map(ChatMessage.fromJson).toList();

  /// Only active participants of an open incident may send (403 otherwise).
  Future<ChatMessage> send(int incidentId, String content) async =>
      ChatMessage.fromJson(
        asJsonMap(
          await _api.post(
            '/api/incidents/$incidentId/chat',
            body: {'content': content},
          ),
        ),
      );
}
