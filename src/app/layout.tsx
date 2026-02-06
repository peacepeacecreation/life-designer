import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { GlobalSettingsProvider } from "@/contexts/GlobalSettingsContext";
import { GoalsProvider } from "@/contexts/GoalsContext";
import { HabitsProvider } from "@/contexts/HabitsContext";
import { ClockifyProvider } from "@/contexts/ClockifyContext";
import { CalendarEventsProvider } from "@/contexts/CalendarEventsContext";
import { RecurringEventsProvider } from "@/contexts/RecurringEventsContext";
import { TimeCalculatorProvider } from "@/contexts/TimeCalculatorContext";
import { NotesProvider } from "@/contexts/NotesContext";
import { ReflectionsProvider } from "@/contexts/ReflectionsContext";
import SessionProvider from "@/components/SessionProvider";
import Header from "@/components/Header";
import { ConfirmProvider } from "@/hooks/use-confirm";
import { ClockifyWidget } from "@/components/clockify/ClockifyWidget";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <SessionProvider>
          <GlobalSettingsProvider>
            <GoalsProvider>
              <HabitsProvider>
                <ClockifyProvider>
                  <CalendarEventsProvider>
                  <NotesProvider>
                    <ReflectionsProvider>
                      <RecurringEventsProvider>
                        <TimeCalculatorProvider>
                          <ConfirmProvider>
                            <Toaster />
                            <Header />
                            {children}
                            <ClockifyWidget />
                          </ConfirmProvider>
                        </TimeCalculatorProvider>
                      </RecurringEventsProvider>
                    </ReflectionsProvider>
                  </NotesProvider>
                </CalendarEventsProvider>
                </ClockifyProvider>
              </HabitsProvider>
            </GoalsProvider>
          </GlobalSettingsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
