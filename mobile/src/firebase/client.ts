import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from "firebase/auth";
import { config } from "@/constants/config";

const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(firebaseApp);
}

export const firebaseAuth = auth;

// The Firebase JS SDK's phone auth normally requires a RecaptchaVerifier,
// which needs a real DOM element to attach to -- something React Native
// fundamentally doesn't have (confirmed broken; there's no working
// workaround package for this anymore, expo-firebase-recaptcha was
// deprecated and removed at Expo SDK 48). This setting is Firebase's own
// documented escape hatch: for phone numbers registered as "test numbers"
// in Firebase Console -> Authentication -> Sign-in method -> Phone, it
// skips the verifier requirement entirely and accepts the fixed test OTP.
// It has no effect on real phone numbers either way -- those still need a
// real, solved reCAPTCHA, which is the part that doesn't run here. See
// src/hooks/auth/usePhoneVerification.ts for where this actually gets used.
firebaseAuth.settings.appVerificationDisabledForTesting = true;