import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useCrewForUnit } from "@/hooks/shifts/useCrewForUnit";

export function CrewList({ unitId }: { unitId: number }) {
  const { t } = useTranslation();
  const { data: crew, isLoading } = useCrewForUnit(unitId);

  if (isLoading || !crew || crew.length === 0) return null;

  return (
    <View className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {t("responder.shift.yourCrew")}
      </Text>
      <View className="gap-2">
        {crew.map((c) => (
          <View key={c.id} className="flex-row items-center justify-between">
            <Text className="text-[15px] text-slate-900 dark:text-slate-100">{c.employeeName}</Text>
            <View
              className={`rounded-full px-2 py-0.5 ${
                c.roleInShift === "LEAD" ? "bg-blue-50 dark:bg-blue-950" : "bg-slate-100 dark:bg-slate-800"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  c.roleInShift === "LEAD" ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {t(`enums.roleInShift.${c.roleInShift}`)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
