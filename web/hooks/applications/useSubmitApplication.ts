import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { FirstResponderApplication } from "@/types/firstResponderApplication";

export function useSubmitApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => apiFetch<FirstResponderApplication>("/api/first-responder-applications", { method: "POST", body: formData }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}