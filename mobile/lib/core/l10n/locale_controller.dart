import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/preferences.dart';

/// A language the app ships translations for. Adding one means adding an ARB
/// file and one entry here.
class AppLanguage {
  const AppLanguage(this.locale, this.name);

  final Locale locale;
  final String name; // always shown in its own language
}

const supportedLanguages = [
  AppLanguage(Locale('en'), 'English'),
  AppLanguage(Locale('ar'), 'العربية'),
];

final localeControllerProvider =
    NotifierProvider<LocaleController, Locale>(LocaleController.new);

/// The user's chosen language (persisted), falling back to the device's, then
/// English. Switching is instant -- Flutter re-lays out the whole app,
/// including right-to-left mirroring, with no restart.
class LocaleController extends Notifier<Locale> {
  @override
  Locale build() {
    final saved = ref.read(sharedPreferencesProvider).getString(PrefKeys.locale);
    final code = saved ?? PlatformDispatcher.instance.locale.languageCode;
    return supportedLanguages
        .map((language) => language.locale)
        .firstWhere((locale) => locale.languageCode == code, orElse: () => const Locale('en'));
  }

  Future<void> setLocale(Locale locale) async {
    if (locale == state) return;
    state = locale;
    await ref.read(sharedPreferencesProvider).setString(PrefKeys.locale, locale.languageCode);
  }
}
