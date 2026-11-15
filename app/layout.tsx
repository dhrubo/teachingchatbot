import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mr. Ranedeer — Edexcel GCSE Maths Voice Tutor",
  description:
    "Voice-first Pearson Edexcel GCSE (9–1) Mathematics (1MA1) AI tutor that explains every topic in 5 distinct ways with Duolingo-style daily practice streaks.",
};

export const viewport: Viewport = {
  themeColor: "#0B1026",
  maximumScale: 1,
};

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable} dark`}
      lang="en-GB"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
          enableSystem={false}
          forcedTheme="dark"
        >
          <TooltipProvider>
            {children}
            <Toaster position="top-center" richColors theme="dark" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
