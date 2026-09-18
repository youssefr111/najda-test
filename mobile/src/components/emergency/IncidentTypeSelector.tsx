import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { IncidentCategory } from "@/types/incident";

const OPTIONS: { value: IncidentCategory; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { value: "MEDICAL", icon: "medkit", labelKey: "citizen.report.categoryMedical" },
  { value: "FIRE", icon: "flame", labelKey: "citizen.report.categoryFire" },
  { value: "POLICE", icon: "shield", labelKey: "citizen.report.categoryPolice" },
];

export function IncidentTypeSelector({
  value,
  onChange,
}: {
  value: IncidentCategory | null;
  onChange: (category: IncidentCategory) => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-3">
      <Text className="text-[13px] font-bold uppercase tracking-wider text-[#5b403f] dark:text-[#c9b8b6]">
        {t("citizen.report.category")}
      </Text>
      <View className="flex-row gap-3">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`flex-1 items-center justify-center gap-2 rounded-xl border-2 py-5 active:scale-95 ${
                selected
                  ? "border-[#b7102a] bg-[#db313f]"
                  : "border-[#e4bebc] bg-[#f8f9fa] dark:border-[#3a2f2e] dark:bg-[#242426]"
              }`}
            >
              <Ionicons name={option.icon} size={32} color={selected ? "#ffffff" : "#b7102a"} />
              <Text
                className={`text-[14px] font-bold ${
                  selected ? "text-white" : "text-[#191c1d] dark:text-[#f3f4f5]"
                }`}
              >
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
