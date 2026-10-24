import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';

enum BackendStatus { checking, online, waking, degraded, unreachable, offline }

class BackendHealth {
  const BackendHealth({
    this.status = BackendStatus.checking,
    this.components = const {},
    this.latencyMs,
    this.checkedAt,
  });

  final BackendStatus status;

  /// `true` = UP, e.g. `{api: true, database: true, auth: false}`.
  final Map<String, bool> components;
  final int? latencyMs;
  final DateTime? checkedAt;

  bool get hasProblem => switch (status) {
    BackendStatus.waking ||
    BackendStatus.degraded ||
    BackendStatus.unreachable ||
    BackendStatus.offline => true,
    _ => false,
  };
}

final backendStatusProvider =
    NotifierProvider<BackendStatusController, BackendHealth>(
      BackendStatusController.new,
    );

/// Watches `/api/status` for as long as something listens (the banner does,
/// for the whole app).
class BackendStatusController extends Notifier<BackendHealth>
    with WidgetsBindingObserver {
  static const _healthyInterval = Duration(seconds: 60);
  static const _wakingAfter = Duration(seconds: 4);

  late final Dio _dio;
  late final String _host;
  Timer? _timer;
  Timer? _wakingTimer;
  int _failures = 0;
  bool _everOnline = false;
  bool _checking = false;

  @override
  BackendHealth build() {
    final baseUrl = ref.read(appConfigProvider).apiBaseUrl;
    _host = Uri.parse(baseUrl).host;
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        validateStatus: (_) => true, // 503 carries the component list we want
      ),
    );

    WidgetsBinding.instance.addObserver(this);
    ref.onDispose(() {
      WidgetsBinding.instance.removeObserver(this);
      _timer?.cancel();
      _wakingTimer?.cancel();
    });
    unawaited(Future<void>.microtask(refresh));
    return const BackendHealth();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(refresh());
  }

  Future<void> refresh() async {
    if (_checking) return;
    _checking = true;
    _timer?.cancel();

    // A cold-starting server answers slowly; say so instead of looking broken.
    _wakingTimer = Timer(_wakingAfter, () {
      if (_checking && !_everOnline) {
        state = const BackendHealth(status: BackendStatus.waking);
      }
    });

    final stopwatch = Stopwatch()..start();
    try {
      final response = await _dio.get<Object?>('/api/status');
      final latency = stopwatch.elapsedMilliseconds;
      final code = response.statusCode ?? 0;
      final components = _components(response.data);

      if (code == 200) {
        _succeed(BackendStatus.online, components, latency);
      } else if (code == 503 && components.isNotEmpty) {
        _succeed(BackendStatus.degraded, components, latency);
      } else {
        _fail(BackendStatus.unreachable);
      }
    } on DioException {
      _fail(
        await _hostResolves()
            ? BackendStatus.unreachable
            : BackendStatus.offline,
      );
    } finally {
      _wakingTimer?.cancel();
      _checking = false;
      _scheduleNext();
    }
  }

  void _succeed(
    BackendStatus status,
    Map<String, bool> components,
    int latency,
  ) {
    _failures = 0;
    _everOnline = true;
    state = BackendHealth(
      status: status,
      components: components,
      latencyMs: latency,
      checkedAt: DateTime.now(),
    );
  }

  void _fail(BackendStatus status) {
    _failures++;
    state = BackendHealth(status: status, checkedAt: DateTime.now());
  }

  void _scheduleNext() {
    final delay = _failures == 0
        ? _healthyInterval
        : Duration(
            milliseconds: math.min(
              30000,
              (5000 * math.pow(1.6, _failures - 1)).round(),
            ),
          );
    _timer = Timer(delay, () => unawaited(refresh()));
  }

  Map<String, bool> _components(Object? body) {
    if (body is Map<String, dynamic> &&
        body['components'] is Map<String, dynamic>) {
      return {
        for (final entry
            in (body['components'] as Map<String, dynamic>).entries)
          entry.key: entry.value == 'UP',
      };
    }
    return const {};
  }

  /// If even the API host does not resolve, the problem is the phone's connection.
  Future<bool> _hostResolves() async {
    try {
      final addresses = await InternetAddress.lookup(
        _host,
      ).timeout(const Duration(seconds: 3));
      return addresses.isNotEmpty;
    } catch (_) {
      return false;
    }
  }
}
