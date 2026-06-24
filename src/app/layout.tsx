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

// NEXT_PUBLIC_SITE_URL must be set in .env.local and in Vercel:
//   NEXT_PUBLIC_SITE_URL=https://lapenultima.alexsosa.me
// Falls back to VERCEL_URL (set automatically by Vercel) or localhost for dev.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "La Penúltima - Polla Mundialista Interna",
  description: "Predice, compite y pelea por la bolsa del Mundial. Solo para amigos.",
  keywords: ["polla mundialista", "predicciones", "fútbol", "mundial 2026", "grupos privados"],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/logo.png",
    apple: "/icons/apple-touch-icon-180-v1.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La Penúltima",
  },
  openGraph: {
    title:       "La Penúltima - Polla Mundialista Interna",
    description: "Predice, compite y pelea por la bolsa del Mundial. Solo para amigos.",
    type:        "website",
    images:      [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "La Penúltima - Polla Mundialista Interna",
    description: "Predice, compite y pelea por la bolsa del Mundial. Solo para amigos.",
    images:      ["/opengraph-image.png"],
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
      <body className="bg-[#0a0a12] text-[#f1f5f9] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
