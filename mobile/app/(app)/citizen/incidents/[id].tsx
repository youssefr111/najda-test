import { useLocalSearchParams } from "expo-router";
import { IncidentDetailScreen } from "@/screens/citizen/IncidentDetailScreen";

export default function IncidentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <IncidentDetailScreen incidentId={Number(id)} />;
}
