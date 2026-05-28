import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "El VAR — Predicciones Copa del Mundo 2026",
  description:
    "Crea grupos privados de predicciones con tus amigos para el Mundial 2026. Predice marcadores, compite en la tabla de posiciones.",
  keywords: ["copa del mundo 2026", "predicciones", "fútbol", "mundial", "FIFA", "grupos"],
  openGraph: {
    title: "El VAR — Predicciones Copa del Mundo 2026",
    description: "Predice. Compite. Domina. Grupos privados para el Mundial 2026.",
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
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-dvh bg-[#0a0a12] text-[#f1f5f9]">
        {children}
      </body>
    </html>
  );
}
