import { Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

const EGYPT_MOBILE_REGEX = /^1[0125]\d{8}$/;

export function isValidEgyptianMobile(localDigits: string): boolean {
  return EGYPT_MOBILE_REGEX.test(localDigits);
}

export function toE164EgyptianPhone(localDigits: string): string {
  return `+20${localDigits}`;
}

type PhoneFieldProps = {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  editable?: boolean;
  noLabel?: boolean;
};

export function PhoneField({ value, onChange, error, editable = true, noLabel }: PhoneFieldProps) {
  const { t } = useTranslation();

  function handleChangeText(text: string) {
    onChange(text.replace(/\D/g, "").slice(0, 10));
  }

  return (
    <View className="gap-1.5">
      {!noLabel ? (
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("auth.phone.label")}</Text>
      ) : null}
      <View
        className={`flex-row items-stretch rounded-md border overflow-hidden bg-white dark:bg-slate-800 ${
          error ? "border-red-400 dark:border-red-700" : "border-slate-300 dark:border-slate-700"
        }`}
      >
        <View className="justify-center px-3 bg-slate-50 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700">
          <Text className="text-sm text-slate-500 dark:text-slate-400">+20</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          editable={editable}
          keyboardType="number-pad"
          placeholder="1012345678"
          placeholderTextColor="#94a3b8"
          className="flex-1 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
        />
      </View>
      {error ? <Text className="text-xs text-red-600 dark:text-red-400">{t("auth.phone.invalid")}</Text> : null}
    </View>
  );
}