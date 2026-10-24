import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/l10n/locale_controller.dart';
import '../../../core/l10n/theme_mode_controller.dart';
import '../../../core/location/location_service.dart';
import '../../../core/location/location_sharing.dart';
import '../../../core/push/push_notifications.dart';  
import '../../../core/update/app_update.dart';
import '../../../core/security/app_lock.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_version_label.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../auth/application/auth_controller.dart';
import 'widgets/settings_widgets.dart';

/// App-level preferences and general pages. Account details (profile,
/// security, medical) live in the Account tab; this screen is about the app.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _toggleLocation(
    BuildContext context,
    WidgetRef ref, {
    required bool enabled,
  }) async {
    final l10n = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    final service = ref.read(locationServiceProvider);

    final result = await ref
        .read(locationSharingProvider.notifier)
        .setEnabled(enabled: enabled);
    ref.invalidate(locationReadinessProvider);
    if (!context.mounted) return;

    final (message, openSettings) = switch (result) {
      LocationReadiness.permissionBlocked => (
        l10n.settingsLocationBlocked,
        true,
      ),
      LocationReadiness.permissionNeeded => (
        l10n.settingsLocationPermissionNeeded,
        false,
      ),
      LocationReadiness.serviceDisabled => (
        l10n.settingsLocationServiceOff,
        true,
      ),
      _ => (null, false),
    };
    if (message == null) return;

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          action: openSettings
              ? SnackBarAction(
                  label: l10n.openSettings,
                  onPressed: () => result == LocationReadiness.serviceDisabled
                      ? service.openLocationSettings()
                      : service.openAppSettings(),
                )
              : null,
        ),
      );
  }

  Future<void> _togglePush(
    BuildContext context,
    WidgetRef ref, {
    required bool enabled,
  }) async {
    final l10n = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    final service = ref.read(locationServiceProvider);

    final result = await ref
        .read(pushNotificationsEnabledProvider.notifier)
        .setEnabled(enabled: enabled);
    if (!context.mounted || result == PushEnableResult.enabled) return;

    // The phone itself is blocking notifications for NAJDA: only its settings can fix that.
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(l10n.settingsPushPermissionDenied),
          action: SnackBarAction(
            label: l10n.openSettings,
            onPressed: service.openAppSettings,
          ),
        ),
      );
  }

  Future<void> _toggleBiometric(
    BuildContext context,
    WidgetRef ref, {
    required bool enabled,
  }) async {
    final l10n = context.l10n;
    final messenger = ScaffoldMessenger.of(context);

    final result = await ref
        .read(appLockProvider.notifier)
        .setEnabled(enabled: enabled, reason: l10n.settingsBiometricReason);
    if (!context.mounted) return;

    final message = switch (result) {
      AppLockToggleResult.unsupported => l10n.settingsBiometricUnsupported,
      AppLockToggleResult.notVerified => l10n.settingsBiometricNotVerified,
      AppLockToggleResult.enabled || AppLockToggleResult.disabled => null,
    };
    if (message == null) return;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _pickAppearance(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    final current = ref.read(themeModeControllerProvider);
    final picked = await showChoiceSheet<ThemeMode>(
      context,
      title: l10n.settingsAppearance,
      options: ThemeMode.values,
      value: current,
      labelOf: (mode) => _themeLabel(context, mode),
      iconOf: (mode) => switch (mode) {
        ThemeMode.system => Icons.brightness_auto_outlined,
        ThemeMode.light => Icons.light_mode_outlined,
        ThemeMode.dark => Icons.dark_mode_outlined,
      },
    );
    if (picked != null) {
      await ref.read(themeModeControllerProvider.notifier).setThemeMode(picked);
    }
  }

  Future<void> _pickLanguage(BuildContext context, WidgetRef ref) async {
    final current = ref.read(localeControllerProvider);
    final picked = await showChoiceSheet<Locale>(
      context,
      title: context.l10n.accountLanguage,
      options: [for (final language in supportedLanguages) language.locale],
      value: current,
      labelOf: (locale) =>
          supportedLanguages.firstWhere((l) => l.locale == locale).name,
    );
    if (picked != null) {
      await ref.read(localeControllerProvider.notifier).setLocale(picked);
    }
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    final confirmed = await confirmAction(
      context,
      title: l10n.accountLogoutConfirm,
      confirmLabel: l10n.accountLogout,
      destructive: true,
    );
    if (confirmed) await ref.read(authControllerProvider.notifier).signOut();
  }

  String _themeLabel(BuildContext context, ThemeMode mode) {
    final l10n = context.l10n;
    return switch (mode) {
      ThemeMode.system => l10n.accountThemeSystem,
      ThemeMode.light => l10n.accountThemeLight,
      ThemeMode.dark => l10n.accountThemeDark,
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final role = ref.watch(currentUserProvider)?.role;
    final sharing = ref.watch(locationSharingProvider);
    final readiness = ref.watch(locationReadinessProvider).value;
    final themeMode = ref.watch(themeModeControllerProvider);
    final update = ref.watch(availableUpdateProvider).value;
    final pushEnabled = ref.watch(pushNotificationsEnabledProvider);
    final pushAvailable = ref
        .watch(pushNotificationServiceProvider)
        .isDeliveryAvailable;
    final biometricEnabled = ref.watch(appLockEnabledProvider);
    final locale = ref.watch(localeControllerProvider);

    // Everyone who can file a report is pre-located for it (responders also share their position
    // through their shift, which is separate).
    final showLocation = role?.canFileReports ?? false;

    final locationSubtitle = switch (readiness) {
      LocationReadiness.permissionBlocked => l10n.settingsLocationBlocked,
      LocationReadiness.serviceDisabled => l10n.settingsLocationServiceOff,
      _ => l10n.settingsLocationSubtitle,
    };

    return Scaffold(
      body: ScreenScaffold(
        scroll: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            BackHeader(title: l10n.settingsTitle, fallbackLocation: '/'),
            SettingsSectionLabel(l10n.settingsPreferences),
            if (update != null) ...[
              SettingsGroup(
                children: [
                  SettingsTile(
                    icon: Icons.system_update_rounded,
                    title: l10n.updateAvailableTitle,
                    subtitle: update.version,
                    trailing: const SettingsChevron(),
                    onTap: () => openUpdate(update),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            SettingsGroup(
              children: [
                if (showLocation)
                  SettingsTile(
                    icon: Icons.location_on_outlined,
                    title: l10n.settingsLocationTitle,
                    subtitle: locationSubtitle,
                    trailing: SettingsSwitch(
                      value:
                          sharing &&
                          readiness != LocationReadiness.permissionBlocked,
                      onChanged: (value) =>
                          _toggleLocation(context, ref, enabled: value),
                    ),
                    onTap: () =>
                        _toggleLocation(context, ref, enabled: !sharing),
                  ),
                SettingsTile(
                  icon: Icons.notifications_none_rounded,
                  title: l10n.settingsPushTitle,
                  // Honest until delivery exists: the choice is saved, but nothing is sent yet.
                  subtitle: pushAvailable
                      ? l10n.settingsPushSubtitle
                      : l10n.settingsPushPending,
                  trailing: SettingsSwitch(
                    value: pushEnabled,
                    onChanged: (value) =>
                        _togglePush(context, ref, enabled: value),
                  ),
                  onTap: () => _togglePush(context, ref, enabled: !pushEnabled),
                ),
                SettingsTile(
                  icon: Icons.fingerprint_rounded,
                  title: l10n.settingsBiometricTitle,
                  subtitle: l10n.settingsBiometricSubtitle,
                  trailing: SettingsSwitch(
                    value: biometricEnabled,
                    onChanged: (value) =>
                        _toggleBiometric(context, ref, enabled: value),
                  ),
                  onTap: () => _toggleBiometric(
                    context,
                    ref,
                    enabled: !biometricEnabled,
                  ),
                ),
                SettingsTile(
                  icon: Icons.dark_mode_outlined,
                  title: l10n.settingsAppearance,
                  subtitle: l10n.settingsAppearanceSubtitle,
                  trailing: SettingsValue(_themeLabel(context, themeMode)),
                  onTap: () => _pickAppearance(context, ref),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SettingsSectionLabel(l10n.settingsGeneral),
            SettingsGroup(
              children: [
                SettingsTile(
                  icon: Icons.language_rounded,
                  title: l10n.accountLanguage,
                  subtitle: supportedLanguages
                      .firstWhere((l) => l.locale == locale)
                      .name,
                  trailing: const SettingsChevron(),
                  onTap: () => _pickLanguage(context, ref),
                ),
                SettingsTile(
                  icon: Icons.shield_outlined,
                  title: l10n.settingsPrivacy,
                  trailing: const SettingsChevron(),
                  onTap: () => context.push('/privacy'),
                ),
                SettingsTile(
                  icon: Icons.help_outline_rounded,
                  title: l10n.settingsSupport,
                  trailing: const SettingsChevron(),
                  onTap: () => context.push('/support'),
                ),
                SettingsTile(
                  icon: Icons.description_outlined,
                  title: l10n.settingsTerms,
                  trailing: const SettingsChevron(),
                  onTap: () => context.push('/terms'),
                ),
                SettingsTile(
                  icon: Icons.info_outline_rounded,
                  title: l10n.accountAboutLink,
                  trailing: const SettingsChevron(),
                  onTap: () => context.push('/about'),
                ),
                SettingsTile(
                  icon: Icons.monitor_heart_outlined,
                  title: l10n.accountSystemStatus,
                  trailing: const SettingsChevron(),
                  onTap: () => context.push('/status'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () => _logout(context, ref),
              icon: const Icon(Icons.logout_rounded, size: 20),
              label: Text(
                l10n.accountLogout,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: p.primary,
                backgroundColor: p.primary.withValues(alpha: 0.06),
                side: BorderSide(color: p.primary.withValues(alpha: 0.35)),
                shape: const StadiumBorder(),
              ),
            ),
            const SizedBox(height: 16),
            const AppVersionLabel(),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

/// The "App settings" row from the design; shown at the top of the Account tab.
class SettingsEntryCard extends StatelessWidget {
  const SettingsEntryCard({super.key});

  @override
  Widget build(BuildContext context) {
    return SettingsGroup(
      children: [
        SettingsTile(
          icon: Icons.settings_outlined,
          title: context.l10n.settingsEntry,
          trailing: const SettingsChevron(),
          onTap: () => context.push('/settings'),
        ),
      ],
    );
  }
}
