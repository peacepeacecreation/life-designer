import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoalsProvider } from "@/contexts/GoalsContext";
import SessionProvider from "@/components/SessionProvider";

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
          <GoalsProvider>
            {children}
          </GoalsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
