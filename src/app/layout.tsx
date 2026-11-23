import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: { default: "ATELIER", template: "%s · ATELIER" },
  description: "A considered archive of things, ensembles, looks, items, essentials and records.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-dvh ${inter.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster
            position="bottom-center"
            theme="system"
            toastOptions={{
              classNames: {
                toast: "!rounded-lg !border-border !bg-card !text-foreground !shadow-none !font-sans",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
