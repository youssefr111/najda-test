import type { ComponentProps, PropsWithChildren, ReactElement } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  className?: string;
  /** Lets a child (e.g. a map) temporarily disable the outer scroll while it handles its own pan/zoom gestures -- see LocationPickerMap's usage. Only relevant when scroll is true. */
  scrollEnabled?: boolean;
  refreshControl?: ReactElement<ComponentProps<typeof RefreshControl>>;
}>;

/** Base screen wrapper: safe-area, themed background, optional scroll + keyboard avoidance. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  className,
  scrollEnabled = true,
  refreshControl,
}: Props) {
  const Container = scroll ? ScrollView : View;
  const padding = padded ? "p-4" : "";

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "bottom"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Container
          className={scroll ? undefined : `flex-1 ${padding} ${className ?? ""}`}
          contentContainerClassName={scroll ? `flex-grow ${padding} ${className ?? ""}` : undefined}
          keyboardShouldPersistTaps="handled"
          {...(scroll ? { scrollEnabled, refreshControl } : null)}
        >
          {children}
        </Container>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}