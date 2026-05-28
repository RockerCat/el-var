import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "El VAR — World Cup 2026 Predictions",
  description:
    "Create private prediction groups with friends for FIFA World Cup 2026. Predict scores, compete on leaderboards.",
  keywords: ["world cup 2026", "predictions", "football", "soccer", "FIFA"],
  openGraph: {
    title: "El VAR — World Cup 2026 Predictions",
    description: "Predict. Compete. Dominate. Private groups for World Cup 2026.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-dvh bg-[#0a0a12] text-[#f1f5f9]">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
