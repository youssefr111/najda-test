import { apiFetch } from "@/api/client";
import type { Gender } from "@/types/user";

const CITIZEN_REGISTER_PATH = "/api/auth/register/citizen";

export type RegisterCitizenPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  gender?: Gender | null;
  provider?: string;
};

/**
 * Creates the Postgres row for a citizen who just authenticated with
 * Firebase for the first time. Mirrors the web app's bootstrap call
 * one-for-one -- same endpoint, same payload shape, same backend.
 */
export async function registerCitizenBootstrap(payload: RegisterCitizenPayload): Promise<void> {
  const path = payload.provider ? `${CITIZEN_REGISTER_PATH}?provider=${payload.provider}` : CITIZEN_REGISTER_PATH;
  await apiFetch(path, {
    method: "POST",
    body: JSON.stringify({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone ?? null,
      gender: payload.gender ?? null,
      address: payload.address ?? null,
    }),
  });
}
