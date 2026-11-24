import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/live/live_stream.dart';
import '../../../core/live/stomp_hub.dart';
import '../data/chat_repository.dart';
import '../domain/chat_message.dart';

/// The incident's chat, refetched whenever the backend publishes a message.
final chatMessagesProvider = StreamProvider.autoDispose
    .family<List<ChatMessage>, int>((ref, incidentId) {
      final repository = ref.watch(chatRepositoryProvider);
      return liveStream(
        hub: ref.watch(stompHubProvider),
        topics: ['/topic/incidents/$incidentId/chat'],
        fetch: () => repository.messages(incidentId),
      );
    });
