import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/types/user";

// Spring Data's default Page<T> serialization — `content` is the actual
// array, the rest is pagination metadata. Not paginated client-side yet;
// server defaults to a 20-item page, so this silently shows only page 0
// once you cross 20 users. Flagging now rather than waiting for the next
// surprise — worth building pagination into UsersTable before real data
// volume hits it.
type UsersPage = {
  content: User[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const page = await apiFetch<UsersPage>("/api/users");
      return page.content;
    },
    staleTime: 30_000,
  });
}