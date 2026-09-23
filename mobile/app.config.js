const IS_TEST = process.env.APP_VARIANT === "test";

const appId = IS_TEST ? "com.najda.mobile.test" : "com.najda.mobile";

export default {
  expo: {
    name: IS_TEST ? "Najda (Test)" : "Najda",
    slug: "najda-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: appId,
    userInterfaceStyle: "automatic",
    assetBundlePatterns: ["**/*"],
    ios: {
      icon: "./assets/favicon.ico",
      supportsTablet: true,
      bundleIdentifier: appId,
      config: { usesNonExemptEncryption: false },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "NAJDA uses your location to attach it to the emergency you report and, for on-duty responders, to share live position with dispatch.",
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      },
    },
    android: {
      package: appId,
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        foregroundImage: IS_TEST
          ? "./assets/adaptive-icon-test.png"
          : "./assets/adaptive-icon.png",
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          image: "./assets/splash.png",
          imageWidth: 76,
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "NAJDA uses your location to attach it to the emergency you report and, for on-duty responders, to share live position with dispatch.",
        },
      ],
      "expo-localization",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "57fc4e1d-2ac3-49eb-ba28-df8a13df436c",
      },
    },
  },
};