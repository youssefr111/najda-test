function required(name: string, value: string | undefined): string {
  if (!value) {
    // Thrown at import time on purpose — a missing config value should
    // fail loudly on app boot, not silently 404 the first API call.
    throw new Error(
      `Missing ${name}. Copy .env.example to .env, fill it in, and restart with "expo start -c".`
    );
  }
  return value;
}

export const config = {
  apiBaseUrl: required("EXPO_PUBLIC_API_BASE_URL", process.env.EXPO_PUBLIC_API_BASE_URL),
  wsUrl: required("EXPO_PUBLIC_WS_URL", process.env.EXPO_PUBLIC_WS_URL),
  webAppUrl: required("EXPO_PUBLIC_WEB_APP_URL", process.env.EXPO_PUBLIC_WEB_APP_URL),

  firebase: {
    apiKey: required("EXPO_PUBLIC_FIREBASE_API_KEY", process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    authDomain: required("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: required("EXPO_PUBLIC_FIREBASE_PROJECT_ID", process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: required(
      "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
    ),
    messagingSenderId: required(
      "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ),
    appId: required("EXPO_PUBLIC_FIREBASE_APP_ID", process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  },

  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  },

  emailJs: {
    serviceId: process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID ?? "",
    templateId: process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID ?? "",
    publicKey: process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY ?? "",
  },
} as const;
