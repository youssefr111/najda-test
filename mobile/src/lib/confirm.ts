import { Alert, Platform } from "react-native";

type ConfirmOptions = {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Alert.alert's multi-button form is unreliable on react-native-web -- on
 * web it commonly renders nothing and never fires the callback at all,
 * which is exactly what "the logout button does nothing" looks like when
 * testing via `expo start --web`. This gives every confirm dialog in the
 * app one implementation that actually works on both native and web.
 */
export function confirmAsync(title: string, message?: string, options: ConfirmOptions = {}): Promise<boolean> {
  const { confirmLabel = "OK", cancelLabel = "Cancel", destructive = false } = options;

  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(typeof window !== "undefined" ? window.confirm(text) : false);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}
