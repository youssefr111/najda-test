import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Constants from "expo-constants";

/** Reads the version straight from app.json (via expo-constants) -- one source of truth, never hand-typed twice. */
export function AppVersionLabel({ style, className }: { style?: StyleProp<ViewStyle>; className?: string }) {
  const version = Constants.expoConfig?.version;
  if (!version) return null;

  return (
    <View style={style} className={className}>
      <Text className="text-[11px] text-slate-400 dark:text-slate-600">v{version}</Text>
    </View>
  );
}
