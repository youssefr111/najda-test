import { ActivityIndicator, Text, View } from "react-native";
import { useTheme } from "@/theme";

export function LoadingOverlay({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-slate-50 dark:bg-slate-950">
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text className="text-[15px] text-slate-500 dark:text-slate-400">{label}</Text> : null}
    </View>
  );
}
