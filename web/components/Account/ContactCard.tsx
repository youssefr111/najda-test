"use client";

import { useTranslations } from "next-intl";
import type { User } from "@/types/user";
import AccountCard from "./AccountCard";
import EmailSection from "./EmailSection";
import PhoneChangeSection from "./PhoneChangeSection";

/** Email and phone are the sign-in and recovery channels, so each has its own verify/change flow. */
export default function ContactCard({ user }: { user: User }) {
  const t = useTranslations("account");

  return (
    <AccountCard title={t("contact.title")} description={t("contact.description")}>
      <div className="grid gap-6 sm:grid-cols-2">
        <EmailSection user={user} />
        <PhoneChangeSection user={user} />
      </div>
    </AccountCard>
  );
}