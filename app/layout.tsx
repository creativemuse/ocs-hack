import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import localFont from "next/font/local";
import { RootProvider } from "./rootProvider";
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

export const metadata: Metadata = {
  title: "BEATME",
  description: "Name that tune, win your reward.",
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://beatme.creativeplatform.xyz/assets/BEATME_hero.png",
      button: {
        title: "Drop the Beat",
        action: {
          type: "launch_frame",
          name: "BEATME",
          url: "https://beatme.creativeplatform.xyz",
          splashImageUrl: "https://beatme.creativeplatform.xyz/assets/BEATME.png",
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
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
