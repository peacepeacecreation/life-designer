import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GlobalSettingsProvider } from "@/contexts/GlobalSettingsContext";
import { GoalsProvider } from "@/contexts/GoalsContext";
import { CalendarEventsProvider } from "@/contexts/CalendarEventsContext";
import { RecurringEventsProvider } from "@/contexts/RecurringEventsContext";
import { TimeCalculatorProvider } from "@/contexts/TimeCalculatorContext";
import { NotesProvider } from "@/contexts/NotesContext";
import { ReflectionsProvider } from "@/contexts/ReflectionsContext";
import SessionProvider from "@/components/SessionProvider";
import Header from "@/components/Header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Life Designer",
    template: "%s | Life Designer",
  },
  description: "Design your life with purpose and intention. Set goals, track time, plan your calendar, and reflect on your journey.",
  keywords: ["life design", "goal tracking", "time management", "personal development", "productivity"],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3077"
  ),
  verification: {
    google: "KfzEPpq_Kig0MYFqDaXAZ4VUD7Q3a-dMSATNzoZy8hg",
  },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    title: "Life Designer",
    description: "Design your life with purpose and intention",
    siteName: "Life Designer",
    images: [{
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "Life Designer",
      type: "image/png",
    }],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "512x512", type: "image/png" },
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <GlobalSettingsProvider>
            <GoalsProvider>
              <CalendarEventsProvider>
                <NotesProvider>
                  <ReflectionsProvider>
                    <RecurringEventsProvider>
                      <TimeCalculatorProvider>
                        <Header />
                        {children}
                      </TimeCalculatorProvider>
                    </RecurringEventsProvider>
                  </ReflectionsProvider>
                </NotesProvider>
              </CalendarEventsProvider>
            </GoalsProvider>
          </GlobalSettingsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
