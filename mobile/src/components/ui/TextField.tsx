import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  className?: string;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, className, secureTextEntry, onFocus, onBlur, ...inputProps },
  ref
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Text> : null}
      <View className="relative justify-center">
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !revealed}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={`h-[46px] rounded-md border px-3 text-[15px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 ${
            isPassword ? "pr-10" : ""
          } ${
            error
              ? "border-red-600"
              : focused
                ? "border-blue-500"
                : "border-slate-300 dark:border-slate-700"
          } ${className ?? ""}`}
          {...inputProps}
        />
        {isPassword ? (
          <Pressable onPress={() => setRevealed((v) => !v)} className="absolute right-3 h-6 w-6 items-center justify-center">
            <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-xs text-red-600 dark:text-red-400">{error}</Text> : null}
    </View>
  );
});
