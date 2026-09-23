import type { PropsWithChildren } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { Direction } from "@/lib/locale/useDirection";

/**
 * Applies a specific direction to this element only, regardless of the
 * app's current language -- the same job web's `dir="ltr"` / `dir="rtl"`
 * attribute does on a DOM element. Get `dir` from useDirection() once,
 * pass it down to whichever specific components you want it applied to.
 *
 * This is independent of the app's overall (always-LTR) chrome: Yoga
 * (React Native's layout engine) reads `direction` per-node and inherits
 * it to children, with no reload needed, since it's a plain style
 * property, not a native-level setting.
 *
 * Example -- a coordinate that should always read LTR even in an Arabic
 * screen:
 *   <Directional dir="ltr"><Text>30.0444° N, 31.2357° E</Text></Directional>
 *
 * Example -- a paragraph that should follow whatever the current language is:
 *   const dir = useDirection();
 *   <Directional dir={dir}><Text>{t("about.description")}</Text></Directional>
 */
export function Directional({
  dir,
  children,
  style,
}: PropsWithChildren<{ dir: Direction; style?: StyleProp<ViewStyle> }>) {
  return <View style={[{ direction: dir }, style]}>{children}</View>;
}
