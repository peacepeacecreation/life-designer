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
  title: "Life Designer",
  description: "Design your life with purpose and intention",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3077"
  ),
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
