import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'app_router.dart';

/// `/citizen` or `/responder`: the tab area the current screen belongs to. Responders can file and follow
/// reports just like citizens, but inside their own tab bar; screens shared by both build their links from
/// this instead of hard-coding `/citizen`, so a responder is never thrown into the citizen area.
String areaOf(BuildContext context) =>
    GoRouterState.of(context).uri.path.startsWith(Routes.responder) ? Routes.responder : Routes.citizen;
