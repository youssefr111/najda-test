import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { useDebouncedValue } from "../useDebouncedValue";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailExistsResponse = { exists: boolean };

export type EmailAvailability = "idle" | "checking" | "available" | "taken" | "error";

export function useEmailAvailability(email: string): EmailAvailability {
  const debouncedEmail = useDebouncedValue(email.trim(), 500);
  const isValidFormat = EMAIL_RE.test(debouncedEmail);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["email-exists", debouncedEmail],
    queryFn: ({ signal }) =>
      apiFetch<EmailExistsResponse>(`/api/auth/email-exists?email=${encodeURIComponent(debouncedEmail)}`, { signal }),
    enabled: isValidFormat,
    staleTime: 60_000,
  });

  if (!isValidFormat) return "idle";
  if (isFetching) return "checking";
  if (isError) return "error";
  if (data) return data.exists ? "taken" : "available";
  return "idle";
}
