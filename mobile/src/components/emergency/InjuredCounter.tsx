import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export function InjuredCounter({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center justify-between rounded-xl bg-[#edeeef] p-4 dark:bg-[#242426]">
      <View className="flex-row items-center gap-3">
        <Ionicons name="bandage-outline" size={22} color="#b7102a" />
        <Text className="text-[16px] font-semibold text-[#191c1d] dark:text-[#f3f4f5]">
          {t("citizen.report.injuredCount")}
        </Text>
      </View>
      <View className="flex-row items-center gap-3 rounded-full border border-[#e4bebc] bg-[#f8f9fa] p-1 dark:border-[#3a2f2e] dark:bg-[#1a1a1c]">
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          className="h-9 w-9 items-center justify-center rounded-full bg-[#edeeef] dark:bg-[#2f2f31]"
        >
          <Ionicons name="remove" size={18} color="#191c1d" />
        </Pressable>
        <Text className="w-8 text-center text-xl font-extrabold text-[#191c1d] dark:text-[#f3f4f5]">{value}</Text>
        <Pressable
          onPress={() => onChange(value + 1)}
          className="h-9 w-9 items-center justify-center rounded-full bg-[#b7102a] active:opacity-90"
        >
          <Ionicons name="add" size={18} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}
