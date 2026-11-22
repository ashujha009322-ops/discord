import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { CallingProvider } from "@/components/CallingProvider";
import InstallPwaModal from "@/components/InstallPwaModal";
import AppNavbar from "@/components/AppNavbar";

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
  title: {
    default: "Calling App",
    template: "%s | Calling",
  },
  description: "Peer-to-peer voice and video calling app.",
  applicationName: "Calling App",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Calling",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ClerkProvider>
          <TooltipProvider>
            <CallingProvider>
              <AppNavbar />

              <main className="flex-1">{children}</main>

              <InstallPwaModal />
            </CallingProvider>
          </TooltipProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
