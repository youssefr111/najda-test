import type { Metadata } from "next";

export const siteMetadata: Metadata = {
  metadataBase: new URL("https://najda.vercel.app"),

  title: {
    default: "NAJDA",
    template: "%s | NAJDA",
  },

  description:
    "NAJDA (Network for AI-powered Joint Dispatch & Assistance) is an AI-powered emergency dispatch simulation platform that coordinates citizens, dispatchers, emergency responders, hospitals, and administrators through real-time communication and intelligent decision support.",

  authors: [{ name: "NAJDA Team" }],
  creator: "NAJDA Team",

  openGraph: {
    title: "NAJDA",
    description:
      "AI-powered emergency dispatch simulation platform with real-time coordination and intelligent decision support.",
    url: "https://najda.vercel.app",
    siteName: "NAJDA",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NAJDA",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "NAJDA",
    description:
      "AI-powered emergency dispatch simulation platform with real-time coordination.",
  },

  verification: {
    google: "7XekkA6mjhu8qgSxHMJLgx72w5VOMwCc8-am3RQBBKY",
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/favicon.ico",
  },

  keywords: [
    // English keywords
    "NAJDA",
    "Network for AI-powered Joint Dispatch & Assistance",
    "emergency dispatch",
    "AI",
    "emergency response",
    "incident management",
    "microservices",
    "Spring Boot",
    "Next.js",
    "real-time tracking",
    "hospital management",
    "dispatcher dashboard",
    // Arabic keywords
    "نجدة",
    "منصة نجدة",
    "إرسال الطوارئ",
    "استجابة للطوارئ",
    "الذكاء الاصطناعي",
    "إدارة الحوادث",
    "تتبع في الوقت الفعلي",
    "إدارة المستشفيات",
    "محاكاة الطوارئ",
  ],
};