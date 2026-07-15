import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Ubuntu } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { PRIMARY_SITE_NAME, PRIMARY_SITE_URL } from "@/lib/site";
import "./globals.css";

// Matt King Made This
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
  metadataBase: new URL(PRIMARY_SITE_URL),
  title: PRIMARY_SITE_NAME,
  description: "Weekly music show submissions, queue control, and community updates.",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: PRIMARY_SITE_URL,
    siteName: PRIMARY_SITE_NAME,
    title: PRIMARY_SITE_NAME,
    description: "Weekly music show submissions, queue control, and community updates.",
    images: [
      {
        url: "/assets/UK_logo_optimized.webp",
        alt: `${PRIMARY_SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PRIMARY_SITE_NAME,
    description: "Weekly music show submissions, queue control, and community updates.",
    images: ["/assets/UK_logo_optimized.webp"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: PRIMARY_SITE_NAME,
  },
  icons: {
    apple: "/apple-icon.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#090412",
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
