import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

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
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-[#FBF9F6]">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
