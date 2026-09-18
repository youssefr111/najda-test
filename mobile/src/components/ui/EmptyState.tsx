import { Text, View } from "react-native";

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-1 p-6">
      <Text className="text-center text-[15px] font-medium text-slate-900 dark:text-slate-100">{title}</Text>
      {body ? <Text className="text-center text-[15px] text-slate-500 dark:text-slate-400">{body}</Text> : null}
    </View>
  );
}
