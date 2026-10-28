import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Lets code outside the widget tree (push handlers) show a snackbar on
/// whichever screen is currently visible.
final rootMessengerKeyProvider = Provider<GlobalKey<ScaffoldMessengerState>>(
  (ref) => GlobalKey<ScaffoldMessengerState>(debugLabel: 'root-messenger'),
);
