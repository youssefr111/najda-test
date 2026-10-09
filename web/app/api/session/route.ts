export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { adminAuth } from "@/lib/firebase/admin";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/locale/config";
import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = SUPPORTED_LOCALES.includes(storedLocale as Locale) ? (storedLocale as Locale) : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: "session" });

  const body = await request.json().catch(() => null);
  const idToken = body?.idToken;

  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: t("missingIdToken") }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (err) {
    return NextResponse.json(
      { error: t("invalidCredential"), details: err instanceof Error ? err.message : String(err) },
      { status: 401 }
    );
  }

  const role = decoded.role as string | undefined;

  if (!role) {
    const signInProvider = decoded.firebase?.sign_in_provider;

    if (signInProvider === "google.com") {
      return NextResponse.json({ error: t("noAccountGoogle") }, { status: 404 });
    }

    return NextResponse.json({ error: t("noRoleAssigned") }, { status: 403 });
  }

  const sessionCookie = await createSessionCookie(idToken);
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ ok: true, role });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}