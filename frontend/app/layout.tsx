import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { headers } from "next/headers";

// Font for body text and UI (Switzer alternative per brand guidelines)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Font for titles (Lineca alternative per brand guidelines)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oracle Arena",
  description: "AI-powered games on GenLayer blockchain. Prompt engineering battles and real-world trivia — judged by decentralized AI consensus.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookie = (await headers()).get("cookie");
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning className="bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary min-h-screen overflow-x-hidden">

        {/* Background Effects from generated-page.html */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Glowing Blobs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] opacity-80">
            <div className="absolute top-24 right-1/4 w-[28rem] h-[28rem] bg-secondary rounded-full blur-[140px] mix-blend-color-burn dark:mix-blend-normal opacity-40 dark:opacity-10" />
            <div className="absolute top-0 left-1/4 w-[28rem] h-[28rem] bg-primary rounded-full blur-[140px] mix-blend-color-burn dark:mix-blend-normal opacity-40 dark:opacity-10" />
          </div>
        </div>

        <Providers cookie={cookie}>
          <Navbar />
          <main className="min-h-screen pt-[104px] relative z-10">
            <div className="max-w-[1200px] mx-auto px-6 pb-20">
              {children}
            </div>
          </main>
        </Providers>

        {/* Dynamic Mouse Glow Script would go here or in a component */}
      </body>
    </html>
  );
}
