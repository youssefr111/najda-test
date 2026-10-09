import type { User } from "@/types/user";
import AccountInformation from "./AccountInformation";

export default function AccountFeed({ user }: { user: User | null }) {
  return (
    <div className="bg-white dark:bg-slate-950 md:py-8 transition-colors">
      <div className="flex flex-col w-full mx-auto my-4 lg:my-0 max-w-5xl px-4 2xl:px-0">
        {user && <AccountInformation user={user} />}
      </div>
    </div>
  );
}