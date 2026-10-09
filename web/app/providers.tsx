"use client";

import { QueryProvider } from "@/components/Providers/query-provider";
import { AuthListener } from "@/components/Providers/auth-listener";
import { ThemeProvider } from "next-themes";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
        <QueryProvider>
        <AuthListener />
        {children}
        </QueryProvider>
    </ThemeProvider>
  );
}