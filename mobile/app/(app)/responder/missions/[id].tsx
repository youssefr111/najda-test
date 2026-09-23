import { useLocalSearchParams } from "expo-router";
import { MissionDetailScreen } from "@/screens/responder/MissionDetailScreen";

export default function MissionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MissionDetailScreen missionId={Number(id)} />;
}
