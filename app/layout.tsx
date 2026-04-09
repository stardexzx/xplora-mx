import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Poppins,
  Courier_Prime,
} from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { LangProvider } from "../context/LangContext";
import { MapsProvider } from "../context/MapsContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});
const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  subsets: ["latin"],
});
const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Xplora MX – Descubre lo auténtico de México",
  description:
    "Conectamos turistas con micro y pequeños negocios locales en México. Busca por voz, filtra con IA y explora en el mapa.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Xplora MX" },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon-152x152.png" }, { url: "/icon-192x192.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${poppins.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider>
          <MapsProvider>{children}</MapsProvider>
        </LangProvider>
      </body>
    </html>
  );
}
