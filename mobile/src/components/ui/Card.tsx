import type { PropsWithChildren } from "react";
import { View } from "react-native";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <View
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${
        className ?? ""
      }`}
    >
      {children}
    </View>
  );
}
