import type { Metadata } from "next";
import { Bebas_Neue, Ubuntu } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SiteShell } from "@/components/layout/site-shell";
import "./globals.css";

const bodyFont = Ubuntu({
  variable: "--font-body",
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

const displayFont = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unsigned Review Live / Clown Army",
  description: "Foundation for weekly music show submissions and queue management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full font-body">
        <AuthProvider>
          <SiteShell>{children}</SiteShell>
        </AuthProvider>
      </body>
    </html>
  );
}
