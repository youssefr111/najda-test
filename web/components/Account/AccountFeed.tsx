"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HeartPulse, ShieldCheck, User as UserIcon } from "lucide-react";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import type { User } from "@/types/user";
import AccountHeader from "./AccountHeader";
import ContactCard from "./ContactCard";
import IdentityCard from "@/components/Kyc/IdentityCard";
import MedicalProfileCard from "./MedicalProfileCard";
import PasswordCard from "./PasswordCard";
import PersonalInfoCard from "./PersonalInfoCard";

type AccountTab = "account" | "security" | "medical";

export default function AccountFeed({ user }: { user: User | null }) {
  const t = useTranslations("account.tabs");
  const [tab, setTab] = useState<AccountTab>("account");

  if (!user) return null;

  const tabs: TabItem<AccountTab>[] = [
    {
      id: "account",
      label: t("account"),
      icon: UserIcon,
      content: (
        <>
          <PersonalInfoCard user={user} />
          <IdentityCard />
        </>
      ),
    },
    {
      id: "security",
      label: t("security"),
      icon: ShieldCheck,
      // How to reach you (email, phone) belongs with how you sign in: contact details first, then the password.
      content: (
        <>
          <ContactCard user={user} />
          <PasswordCard />
        </>
      ),
    },
    { id: "medical", label: t("medical"), icon: HeartPulse, content: <MedicalProfileCard /> },
  ];

  return (
    <div className="grow bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:py-10">
        <AccountHeader user={user} />
        <Tabs tabs={tabs} value={tab} onChange={setTab} label={t("label")} />
      </div>
    </div>
  );
}