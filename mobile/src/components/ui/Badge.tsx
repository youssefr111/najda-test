import { Text, View } from "react-native";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "bg-slate-100 dark:bg-slate-800", fg: "text-slate-500 dark:text-slate-400" },
  info: { bg: "bg-slate-100 dark:bg-slate-800", fg: "text-blue-600" },
  success: { bg: "bg-emerald-50 dark:bg-emerald-950", fg: "text-emerald-500" },
  warning: { bg: "bg-amber-50 dark:bg-amber-950", fg: "text-amber-500" },
  danger: { bg: "bg-red-50 dark:bg-red-950", fg: "text-red-600 dark:text-red-400" },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const { bg, fg } = TONE_CLASSES[tone];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${fg}`}>{label}</Text>
    </View>
  );
}
