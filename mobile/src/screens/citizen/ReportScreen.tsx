import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useSubmitIncident } from "@/hooks/incidents/useSubmitIncident";
import { IncidentTypeSelector } from "@/components/emergency/IncidentTypeSelector";
import { InjuredCounter } from "@/components/emergency/InjuredCounter";
import { LocationPickerMap, type PickedLocation } from "@/components/map/LocationPickerMap";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/theme";
import type { Incident, IncidentCategory } from "@/types/incident";

type Stage = "initial" | "confirmation" | "success";

export function ReportScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const submitIncident = useSubmitIncident();

  const [stage, setStage] = useState<Stage>("initial");
  const [category, setCategory] = useState<IncidentCategory | null>("MEDICAL");
  const [injuredCount, setInjuredCount] = useState(0);
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState<PickedLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Incident | null>(null);
  const [mapTouching, setMapTouching] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!pin) {
      setError(t("citizen.report.locationRequired"));
      return;
    }
    if (!category) return;

    try {
      const incident = await submitIncident.mutateAsync({
        category,
        textMessage: description.trim() ? description.trim() : null,
        latitude: pin.latitude,
        longitude: pin.longitude,
        locationSource: pin.source,
        injuredCount,
      });
      setSubmitted(incident);
      setStage("success");
    } catch {
      setError(t("common.error"));
    }
  }

  function reset() {
    setSubmitted(null);
    setCategory("MEDICAL");
    setInjuredCount(0);
    setDescription("");
    setPin(null);
    setError(null);
    setStage("initial");
  }

  if (stage === "success" && submitted) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Ionicons name="checkmark-circle" size={64} color="#166534" />
          <Text className="text-center text-xl font-bold text-[#191c1d] dark:text-[#f3f4f5]">
            {t("citizen.report.alertSent")}
          </Text>
          <Text className="text-center text-[15px] text-[#5b403f] dark:text-[#c9b8b6]">
            {t("citizen.report.submittedToDispatch", { id: submitted.id })}
          </Text>
          <View className="mt-4 w-full gap-2">
            <Pressable
              onPress={() => router.push(`/citizen/incidents/${submitted.id}`)}
              className="items-center rounded-full bg-[#b7102a] px-6 py-3 shadow-sm active:scale-[0.98] active:bg-[#92001c]"
            >
              <Text className="text-[15px] font-bold text-white">{t("citizen.report.viewReport")}</Text>
            </Pressable>
            <Pressable onPress={reset} className="items-center rounded-full px-6 py-3">
              <Text className="text-[15px] font-semibold text-[#b7102a]">{t("citizen.report.done")}</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  if (stage === "initial") {
    return (
      <Screen>
        <View className="mt-4">
          <Text className="text-[22px] font-bold text-[#191c1d] dark:text-[#f3f4f5]">{t("citizen.report.title")}</Text>
          <Text className="mt-1 text-[15px] text-[#5b403f] dark:text-[#c9b8b6]">{t("citizen.report.subtitle")}</Text>
        </View>

        <View className="flex-1 items-center justify-center gap-6">
          <View className="items-center justify-center">
            <View className="absolute h-52 w-52 rounded-full bg-[#b7102a]/10" />
            <View className="absolute h-44 w-44 rounded-full bg-[#b7102a]/15" />
            <Pressable
              onPress={() => setStage("confirmation")}
              className="h-36 w-36 items-center justify-center rounded-full bg-[#b7102a] shadow-lg active:scale-95 active:bg-[#92001c]"
            >
              <Text className="text-xl font-extrabold tracking-wider text-white">{t("citizen.report.sosButton")}</Text>
            </Pressable>
          </View>
          <Text className="text-[15px] font-bold text-[#b7102a]">{t("citizen.report.pressToCall")}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll scrollEnabled={!mapTouching}>
      <Pressable onPress={() => setStage("initial")} className="mb-4 flex-row items-center gap-1.5 self-start">
        <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
        <Text className="text-[15px] text-slate-500 dark:text-slate-400">{t("citizen.report.back")}</Text>
      </Pressable>

      <View className="gap-6">
        <IncidentTypeSelector value={category} onChange={setCategory} />

        <TextField
          label={t("citizen.report.description")}
          placeholder={t("citizen.report.descriptionPlaceholder")}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          className="h-[90px] pt-2"
          textAlignVertical="top"
        />

        <InjuredCounter value={injuredCount} onChange={setInjuredCount} />

        {/* The map handles its own pan/zoom internally (it's a WebView) --
            without this, the outer ScrollView above wins the gesture
            negotiation for any vertical drag and the map never gets to
            pan. Disabling the outer scroll for the duration of any touch
            that starts here hands the gesture to the map cleanly. */}
        <View
          onTouchStart={() => setMapTouching(true)}
          onTouchEnd={() => setMapTouching(false)}
          onTouchCancel={() => setMapTouching(false)}
        >
          <LocationPickerMap value={pin} onChange={setPin} />
        </View>

        {error ? <Text className="text-center text-[14px] font-medium text-[#b7102a]">{error}</Text> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={submitIncident.isPending || !category}
          className={`min-h-14 flex-row items-center justify-center gap-2 rounded-full px-6 py-3 shadow-lg active:scale-[0.98] ${
            submitIncident.isPending ? "bg-[#485f84]" : "bg-[#b7102a] active:bg-[#92001c]"
          } ${!category ? "opacity-50" : ""}`}
        >
          <Ionicons name="megaphone" size={20} color="#ffffff" />
          <Text className="text-[16px] font-semibold text-white">
            {submitIncident.isPending ? t("citizen.report.submitting") : t("citizen.report.submitAlert")}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
