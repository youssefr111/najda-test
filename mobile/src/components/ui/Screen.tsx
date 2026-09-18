import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  className?: string;
}>;

/** Base screen wrapper: safe-area, themed background, optional scroll + keyboard avoidance. */
export function Screen({ children, scroll = false, padded = true, className }: Props) {
  const Container = scroll ? ScrollView : View;
  const padding = padded ? "p-4" : "";

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "bottom"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Container
          className={scroll ? undefined : `flex-1 ${padding} ${className ?? ""}`}
          contentContainerClassName={scroll ? `flex-grow ${padding} ${className ?? ""}` : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </Container>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
