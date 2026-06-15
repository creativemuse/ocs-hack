import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import localFont from "next/font/local";
import { RootProvider } from "./rootProvider";
import { MiniKitLayout } from "@/components/minikit/MiniKitLayout";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { getSiteUrl } from "@/lib/config/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

const audiowide = localFont({
  src: "../public/font/Audiowide-Regular.ttf",
  variable: "--font-audiowide",
  weight: "400",
  display: "swap",
});

const siteUrl = getSiteUrl();

const siteTitle = "BEAT ME";
const siteDescription = "Name the tune, win a reward.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "/",
    siteName: siteTitle,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  other: {
    "base:app_id": process.env.NEXT_PUBLIC_BASE_APP_ID ?? "",
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${siteUrl}/opengraph-image`,
      button: {
        title: "Can you BEAT ME?",
        action: {
          type: "launch_frame",
          name: "BEAT ME",
          url: siteUrl,
          splashImageUrl: `${siteUrl}/opengraph-image`,
          splashBackgroundColor: "#000000"
        }
      }
    })
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sourceCodePro.variable} ${audiowide.variable} min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50`}>
        <RootProvider>
          <MiniKitLayout>
            {children}
          </MiniKitLayout>
        </RootProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
