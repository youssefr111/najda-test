import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n_x.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';
import '../../auth/application/auth_controller.dart';

/// Sends a support message through EmailJS' REST API. The public key is meant
/// to ship in clients, same as on the web.
class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  late final _name = TextEditingController(text: ref.read(currentUserProvider)?.fullName ?? '');
  late final _email = TextEditingController(text: ref.read(currentUserProvider)?.email ?? '');
  final _message = TextEditingController();

  bool _sending = false;
  bool _sent = false;
  bool _failed = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _message.dispose();
    super.dispose();
  }

  bool get _canSend =>
      !_sending && _name.text.trim().isNotEmpty && _email.text.trim().isNotEmpty && _message.text.trim().isNotEmpty;

  Future<void> _send() async {
    final config = ref.read(appConfigProvider).emailJs;
    setState(() {
      _sending = true;
      _sent = false;
      _failed = false;
    });

    try {
      if (!config.isConfigured) throw StateError('EmailJS is not configured for this build.');

      final response = await Dio().post<String>(
        'https://api.emailjs.com/api/v1.0/email/send',
        data: {
          'service_id': config.serviceId,
          'template_id': config.templateId,
          'user_id': config.publicKey,
          'template_params': {
            'from_name': _name.text.trim(),
            'from_email': _email.text.trim(),
            'message': _message.text.trim(),
          },
        },
        options: Options(
          contentType: Headers.jsonContentType,
          validateStatus: (_) => true,
          receiveTimeout: const Duration(seconds: 20),
        ),
      );
      if ((response.statusCode ?? 0) < 200 || (response.statusCode ?? 0) >= 300) {
        throw StateError('EmailJS answered ${response.statusCode}');
      }
      if (mounted) {
        setState(() => _sent = true);
        _message.clear();
      }
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;

    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackHeader(title: l10n.supportTitle, fallbackLocation: '/'),
          Text(l10n.supportDescription, style: TextStyle(fontSize: 15, height: 1.5, color: p.textMuted)),
          const SizedBox(height: 20),
          AppTextField(label: l10n.supportFullname, controller: _name, onChanged: (_) => setState(() {})),
          const SizedBox(height: 12),
          AppTextField(
            label: l10n.supportEmail,
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          AppTextField(
            label: l10n.supportMessage,
            controller: _message,
            minLines: 4,
            maxLines: 8,
            textCapitalization: TextCapitalization.sentences,
            onChanged: (_) => setState(() {}),
          ),
          if (_sent) ...[
            const SizedBox(height: 12),
            Text(l10n.supportSuccess, style: const TextStyle(fontSize: 13, color: AppColors.emerald600)),
          ],
          if (_failed) ...[
            const SizedBox(height: 12),
            Text(l10n.supportError, style: TextStyle(fontSize: 13, color: p.danger)),
          ],
          const SizedBox(height: 16),
          AppButton(
            label: _sending ? l10n.supportSending : l10n.supportSend,
            loading: _sending,
            onPressed: _canSend ? _send : null,
          ),
        ],
      ),
    );
  }
}
