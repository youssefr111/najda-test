import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    auth: ref.watch(firebaseAuthProvider),
    api: ref.watch(apiClientProvider),
    googleWebClientId: ref.watch(appConfigProvider).googleWebClientId,
  );
});

const _signInTimeout = Duration(seconds: 15);

/// Everything that talks to Firebase Auth. Kept free of any UI or state.
class AuthRepository {
  AuthRepository({
    required FirebaseAuth auth,
    required ApiClient api,
    required String googleWebClientId,
  })  : _auth = auth,
        _api = api,
        _google = GoogleSignIn(
          scopes: const ['email'],
          // Audience of the ID token Firebase verifies.
          serverClientId: googleWebClientId,
        );

  final FirebaseAuth _auth;
  final ApiClient _api;
  final GoogleSignIn _google;

  int? _phoneResendToken;

  User? get currentUser => _auth.currentUser;

  bool get hasPasswordProvider =>
      _auth.currentUser?.providerData.any((p) => p.providerId == 'password') ?? false;

  Future<UserCredential> signInWithEmail(String email, String password) {
    return _auth
        .signInWithEmailAndPassword(email: email.trim(), password: password)
        .timeout(
          _signInTimeout,
          onTimeout: () => throw const ApiException(
            'Sign-in timed out. Check your internet connection and try again.',
          ),
        );
  }

  /// Opens the Google account chooser. Returns `null` if the user cancels.
  Future<UserCredential?> signInWithGoogle() async {
    try {
      await _google.signOut(); // always show the account chooser
      final account = await _google.signIn();
      if (account == null) return null;

      final tokens = await account.authentication;
      final idToken = tokens.idToken;
      if (idToken == null) {
        throw const ApiException('No ID token returned from Google sign-in.');
      }
      return await _auth.signInWithCredential(
        GoogleAuthProvider.credential(idToken: idToken),
      );
    } on PlatformException catch (e) {
      if (e.code == GoogleSignIn.kSignInCanceledError) return null;
      rethrow;
    }
  }

  Future<void> sendPasswordReset(String email) =>
      _auth.sendPasswordResetEmail(email: email.trim());

  Future<void> signOut() async {
    await _google.signOut().catchError((Object _) => null);
    await _auth.signOut();
  }

  /// Deletes the Firebase user created by a Google sign-in that must not
  /// become an account (login with an unregistered Google account, or a failed
  /// registration). Only call this for a credential minted by *this* sign-in.
  Future<void> deleteCurrentUserQuietly() async {
    try {
      await _auth.currentUser?.delete();
    } catch (_) {
      // Best effort: signing out below is what matters for the session.
    }
    await signOut();
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final user = _auth.currentUser;
    final email = user?.email;
    if (user == null || email == null) {
      throw FirebaseAuthException(code: 'no-current-user');
    }
    await user.reauthenticateWithCredential(
      EmailAuthProvider.credential(email: email, password: currentPassword),
    );
    await user.updatePassword(newPassword);
  }

  /// Sets the password on an account that was created without one (Google).
  Future<void> setInitialPassword(String password) async {
    await _auth.currentUser?.updatePassword(password);
  }

  Future<void> resendEmailVerification() async {
    final user = _auth.currentUser;
    if (user == null) throw FirebaseAuthException(code: 'no-current-user');
    await user.sendEmailVerification();
  }

  /// `true` if [email] already belongs to another account.
  Future<bool> emailExists(String email) async {
    final json = await _api.get('/api/auth/email-exists', query: {'email': email});
    return json is Map<String, dynamic> && json['exists'] == true;
  }

  /// Sends a confirmation link to the NEW address (hosted entirely by
  /// Firebase -- no page on our own domain is involved).
  Future<void> requestEmailChange(String newEmail) async {
    final user = _auth.currentUser;
    if (user == null) throw FirebaseAuthException(code: 'no-current-user');
    await user.verifyBeforeUpdateEmail(newEmail);
  }

  /// There is no event for "the confirmation link was clicked" (it happens on
  /// a Firebase-hosted page), so the only way to find out is to reload.
  Future<String?> reloadAndGetEmail() async {
    await _auth.currentUser?.reload();
    return _auth.currentUser?.email;
  }

  Future<void> forceTokenRefresh() async {
    await _auth.currentUser?.getIdToken(true);
  }

  /// Starts phone verification and resolves with the verification id once the
  /// SMS has been sent. Firebase handles the app-verification challenge
  /// natively (Play Integrity / reCAPTCHA fallback) -- no WebView needed.
  Future<String> sendPhoneCode(String e164Phone) {
    final completer = Completer<String>();
    unawaited(
      _auth.verifyPhoneNumber(
        phoneNumber: e164Phone,
        timeout: const Duration(seconds: 60),
        forceResendingToken: _phoneResendToken,
        // Auto-retrieval is deliberately ignored: the user confirms with the
        // code, same as every other platform, so the flow behaves identically.
        verificationCompleted: (_) {},
        verificationFailed: (e) {
          if (!completer.isCompleted) completer.completeError(e);
        },
        codeSent: (verificationId, resendToken) {
          _phoneResendToken = resendToken;
          if (!completer.isCompleted) completer.complete(verificationId);
        },
        codeAutoRetrievalTimeout: (_) {},
      ),
    );
    return completer.future;
  }

  Future<void> confirmPhoneCode({
    required String verificationId,
    required String smsCode,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw FirebaseAuthException(code: 'no-current-user');

    final credential = PhoneAuthProvider.credential(
      verificationId: verificationId,
      smsCode: smsCode,
    );
    if (user.phoneNumber != null) {
      await user.updatePhoneNumber(credential);
    } else {
      await user.linkWithCredential(credential);
    }
    await user.getIdToken(true);
  }
}
