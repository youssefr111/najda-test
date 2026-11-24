"use client";

import { useLocale } from "next-intl";
import useAuth from "@/hooks/auth/useAuth";
import Hero from "@/components/Landing/Hero";
import WorkflowSection from "@/components/Landing/WorkflowSection";
import FeaturesSection from "@/components/Landing/FeaturesSection";
import BecomeResponderSection from "@/components/Landing/BecomeResponderSection";
import AppDownloadSection from "@/components/Landing/AppDownloadSection";
import { LANGUAGES } from "@/lib/locale/languages";

export default function LandingPage() {
  const { user } = useAuth();
  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors duration-300" dir={dir}>
      <Hero user={user} />
      <WorkflowSection />
      <FeaturesSection />
      <BecomeResponderSection />
      <AppDownloadSection />
    </main>
  );
}