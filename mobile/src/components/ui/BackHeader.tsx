import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

/**
 * For screens reached via router.push() rather than a tab -- there's no
 * native header anywhere in this app (headerShown: false globally), so
 * these screens need their own way back.
 *
 * Always points left ("chevron-back"): the app's overall chrome stays LTR
 * regardless of language (see decisions.md) -- only specific content
 * blocks flip alignment per-language, via useIsRtlContent(), not chrome
 * like this. If that ever changes, this is the one place to revisit.
 */
export function BackHeader({ title }: { title: string }) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View className="mb-4 flex-row items-center gap-1">
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800"
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">{title}</Text>
    </View>
  );
}
