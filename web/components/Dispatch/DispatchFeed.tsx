import type { User } from "@/types/user";
import IncidentQueueList from "./IncidentQueueList";
import IncidentDetailPanel from "./IncidentDetailPanel";

export default function DispatchFeed({ user }: { user: User | null }) {
  void user; // reserved -- not needed yet, but the page passes it in

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-white dark:bg-slate-950 transition-colors">
      <IncidentQueueList />
      <IncidentDetailPanel />
    </div>
  );
}