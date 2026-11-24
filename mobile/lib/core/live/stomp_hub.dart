import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';

import '../network/api_client.dart';

final stompHubProvider = Provider<StompHub>((ref) {
  final hub = StompHub(ref.watch(appConfigProvider).wsUrl);
  ref.onDispose(hub.dispose);
  return hub;
});

/// One shared STOMP connection for the whole app.
///
/// The socket opens when the first screen listens to a topic and closes when
/// the last one stops. Topics are reference-counted, re-subscribed after every
/// reconnect, and [reconnected] fires so data sources can refetch whatever they
/// missed while offline.
class StompHub {
  StompHub(this._url);

  final String _url;
  final Map<String, _Topic> _topics = {};
  final StreamController<void> _reconnected =
      StreamController<void>.broadcast();

  StompClient? _client;
  bool _connected = false;
  bool _hasConnectedBefore = false;

  /// Emits each time the socket re-establishes after a drop.
  Stream<void> get reconnected => _reconnected.stream;

  /// Frame bodies published on [destination] (`null` for an empty body).
  Stream<String?> topic(String destination) {
    final topic = _topics.putIfAbsent(
      destination,
      () => _Topic(destination, onListen: _onListen, onCancel: _onCancel),
    );
    return topic.controller.stream;
  }

  void _onListen(_Topic topic) {
    _ensureClient();
    if (_connected) _subscribe(topic);
  }

  void _onCancel(_Topic topic) {
    topic.unsubscribe?.call();
    topic.unsubscribe = null;
    _topics.remove(topic.destination);
    unawaited(topic.controller.close());
    if (_topics.isEmpty) _disconnect();
  }

  void _ensureClient() {
    if (_client != null) return;
    _client = StompClient(
      config: StompConfig(
        url: _url,
        reconnectDelay: const Duration(seconds: 5),
        onConnect: _onConnect,
        onDisconnect: (_) => _connected = false,
        onWebSocketDone: () => _connected = false,
        // Errors are expected on flaky mobile networks; the client retries on
        // its own and consumers recover through [reconnected].
        onWebSocketError: (_) => _connected = false,
        onStompError: (_) {},
      ),
    )..activate();
  }

  void _onConnect(StompFrame frame) {
    _connected = true;
    for (final topic in _topics.values) {
      _subscribe(topic);
    }
    if (_hasConnectedBefore) _reconnected.add(null);
    _hasConnectedBefore = true;
  }

  void _subscribe(_Topic topic) {
    topic.unsubscribe?.call();
    topic.unsubscribe = _client?.subscribe(
      destination: topic.destination,
      callback: (frame) {
        if (!topic.controller.isClosed) topic.controller.add(frame.body);
      },
    );
  }

  void _disconnect() {
    _client?.deactivate();
    _client = null;
    _connected = false;
    _hasConnectedBefore = false;
  }

  void dispose() {
    _disconnect();
    for (final topic in _topics.values) {
      unawaited(topic.controller.close());
    }
    _topics.clear();
    unawaited(_reconnected.close());
  }
}

class _Topic {
  _Topic(
    this.destination, {
    required void Function(_Topic) onListen,
    required void Function(_Topic) onCancel,
  }) {
    controller = StreamController<String?>.broadcast(
      onListen: () => onListen(this),
      onCancel: () => onCancel(this),
    );
  }

  final String destination;
  // The owning StompHub closes this controller when the topic is cancelled or
  // disposed; the analyzer cannot track that ownership across callbacks.
  // ignore: close_sinks
  late final StreamController<String?> controller;
  StompUnsubscribe? unsubscribe;
}
