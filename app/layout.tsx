import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { getMessages } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/i18n-provider";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.app.name, description: t.app.tagline };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, t } = await getMessages();

  return (
    <html
      lang={locale}
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        publicSans.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} messages={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
