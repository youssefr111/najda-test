import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/responder_application_repository.dart';
import '../domain/responder_application.dart';

final myApplicationsProvider =
    FutureProvider.autoDispose<List<ResponderApplication>>(
      (ref) => ref.watch(responderApplicationRepositoryProvider).mine(),
    );
