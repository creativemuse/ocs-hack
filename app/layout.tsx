import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import localFont from "next/font/local";
import { RootProvider } from "./rootProvider";
import { MiniKitLayout } from "@/components/minikit/MiniKitLayout";
import { SpeedInsights } from '@vercel/speed-insights/next';
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

const siteUrl =
  process.env.NEXT_PUBLIC_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

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
    images: [
      {
        url: "/assets/BEAT_ME_thumbnail.png",
        width: 1200,
        height: 1200,
        alt: "BEAT ME — Name the tune, win the reward",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/assets/BEAT_ME_thumbnail.png"],
  },
  other: {
    "base:app_id": process.env.NEXT_PUBLIC_BASE_APP_ID ?? "",
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://beatme.creativeplatform.xyz/assets/BEAT_ME_thumbnail.png",
      button: {
        title: "Can you BEAT ME?",
        action: {
          type: "launch_frame",
          name: "BEAT ME",
          url: "https://beatme.creativeplatform.xyz",
          splashImageUrl: "https://beatme.creativeplatform.xyz/assets/BEAT_ME_thumbnail.png",
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
