import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/registration_repository.dart';

enum EmailOtpStatus { idle, sent, verified }

class EmailOtpState {
  const EmailOtpState({
    this.status = EmailOtpStatus.idle,
    this.verificationToken,
    this.cooldown = 0,
    this.pending = false,
  });

  final EmailOtpStatus status;
  final String? verificationToken;
  final int cooldown;
  final bool pending;

  bool get isVerified => status == EmailOtpStatus.verified && verificationToken != null;

  EmailOtpState copyWith({
    EmailOtpStatus? status,
    String? verificationToken,
    bool clearToken = false,
    int? cooldown,
    bool? pending,
  }) =>
      EmailOtpState(
        status: status ?? this.status,
        verificationToken: clearToken ? null : (verificationToken ?? this.verificationToken),
        cooldown: cooldown ?? this.cooldown,
        pending: pending ?? this.pending,
      );
}

final emailOtpControllerProvider =
    NotifierProvider.autoDispose<EmailOtpController, EmailOtpState>(EmailOtpController.new);

/// Owns the OTP lifecycle for one email address: idle -> sent -> verified.
/// Errors are rethrown so the screen decides how to present them.
class EmailOtpController extends AutoDisposeNotifier<EmailOtpState> {
  Timer? _cooldownTimer;

  @override
  EmailOtpState build() {
    ref.onDispose(() => _cooldownTimer?.cancel());
    return const EmailOtpState();
  }

  /// Call whenever the email changes: a verification only ever applies to one address.
  void reset() {
    _cooldownTimer?.cancel();
    state = const EmailOtpState();
  }

  Future<void> send(String email) async {
    state = state.copyWith(pending: true);
    try {
      final sent = await ref.read(registrationRepositoryProvider).sendEmailOtp(email);
      state = state.copyWith(
        status: EmailOtpStatus.sent,
        cooldown: sent.resendAfterSeconds,
        pending: false,
      );
      _startCooldown();
    } catch (_) {
      state = state.copyWith(pending: false);
      rethrow;
    }
  }

  Future<void> verify(String email, String code) async {
    state = state.copyWith(pending: true);
    try {
      final verified = await ref.read(registrationRepositoryProvider).verifyEmailOtp(email, code);
      state = state.copyWith(
        status: EmailOtpStatus.verified,
        verificationToken: verified.verificationToken,
        pending: false,
      );
    } catch (_) {
      state = state.copyWith(pending: false);
      rethrow;
    }
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.cooldown <= 1) {
        timer.cancel();
        state = state.copyWith(cooldown: 0);
      } else {
        state = state.copyWith(cooldown: state.cooldown - 1);
      }
    });
  }
}
