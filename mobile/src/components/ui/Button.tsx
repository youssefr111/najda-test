import { ActivityIndicator, Pressable, Text } from "react-native";
import { useTheme } from "@/theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

const CONTAINER_CLASSES: Record<Variant, string> = {
  primary: "bg-blue-600 shadow-sm active:bg-blue-800",
  secondary: "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-700",
  danger: "bg-red-600 shadow-sm active:bg-red-800",
  ghost: "bg-transparent active:opacity-70",
};

const LABEL_CLASSES: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-slate-700 dark:text-slate-200",
  danger: "text-white",
  ghost: "text-blue-600",
};

export function Button({ label, onPress, variant = "primary", loading = false, disabled = false, className }: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const spinnerColor = variant === "secondary" || variant === "ghost" ? colors.primary : colors.textInverted;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 rounded-md px-4 py-3 ${CONTAINER_CLASSES[variant]} ${
        isDisabled ? "opacity-50" : ""
      } ${className ?? ""}`}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text className={`text-[15px] font-semibold ${LABEL_CLASSES[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
