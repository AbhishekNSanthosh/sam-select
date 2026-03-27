import type { Metadata, Viewport } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SamSelect – Sam's Creations Album Selection",
  description:
    "Browse and select your favourite wedding photos for your album. A premium photo selection experience by Sam's Creations.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "SamSelect – Sam's Creations",
    description: "Your premium wedding album selection experience",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FBF9F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`h-full antialiased ${outfit.variable} ${playfair.variable}`}>
      <body className="min-h-full flex flex-col bg-[#FBF9F6]">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
