import { useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { config } from "@/constants/config";
import { Screen } from "@/components/ui/Screen";
import { BackHeader } from "@/components/ui/BackHeader";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

type Status = "idle" | "sending" | "sent" | "error";

/** Same EmailJS account as the web app's Support form -- a plain REST call, no SDK needed. */
async function sendSupportMessage(name: string, email: string, message: string) {
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: config.emailJs.serviceId,
      template_id: config.emailJs.templateId,
      user_id: config.emailJs.publicKey,
      template_params: { from_name: name, from_email: email, message },
    }),
  });
  if (!response.ok) throw new Error(await response.text());
}

export function SupportScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit() {
    setStatus("sending");
    try {
      await sendSupportMessage(name, email, message);
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Screen scroll>
      <BackHeader title={t("support.title")} />
      <View className="mb-6">
        <Text className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t("support.title")}</Text>
        <Text className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">{t("support.description")}</Text>
      </View>

      {status === "sent" ? (
        <Text className="text-[15px] text-emerald-600 dark:text-emerald-400">{t("support.success")}</Text>
      ) : (
        <View className="gap-4">
          <TextField label={t("support.fullname")} value={name} onChangeText={setName} />
          <TextField
            label={t("support.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField
            label={t("support.message")}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            className="h-[120px] pt-2"
            textAlignVertical="top"
          />
          {status === "error" ? (
            <Text className="text-[13px] text-red-600 dark:text-red-400">{t("support.error")}</Text>
          ) : null}
          <Button
            label={status === "sending" ? t("support.sending") : t("support.send")}
            onPress={handleSubmit}
            loading={status === "sending"}
            disabled={!name || !email || !message}
          />
        </View>
      )}
    </Screen>
  );
}
