import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';

/// Lets a native map claim drags that start on it even inside a scroll view.
const Set<Factory<OneSequenceGestureRecognizer>> mapGestureRecognizers = {
  Factory<OneSequenceGestureRecognizer>(EagerGestureRecognizer.new),
};
