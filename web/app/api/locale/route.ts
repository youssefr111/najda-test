import { NextRequest, NextResponse } from "next/server";
import { SUPPORTED_LOCALES, LOCALE_COOKIE } from "@/lib/locale/config";

export async function POST(request: NextRequest) {
  const { locale } = await request.json();
  if (!SUPPORTED_LOCALES.includes(locale)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  return response;
}