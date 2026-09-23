import type { Metadata } from "next";
import { siteMetadata } from "@/seo/metadata";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import "./globals.css";
import Providers from "./providers";
import ProfileGate from "@/components/Auth/ProfileGate";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export const metadata: Metadata = siteMetadata;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className="antialiased scroll-smooth"
      suppressHydrationWarning
    >
      <body>
      <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
              <main className="flex-1">
                <ProfileGate>{children}</ProfileGate>
              </main>
            <Footer />
          </div>
      </Providers>
      </NextIntlClientProvider>
      </body>
    </html>
  );
}
