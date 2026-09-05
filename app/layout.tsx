import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import TermsAcceptanceModal from "@/components/TermsAcceptanceModal";
import PagePreloader from "@/components/PagePreloader";
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
  metadataBase: new URL("https://outbidind.com"),

  title: {
    default: "OutbidInd – Business Auction & Bidding Marketplace in India",
    template: "%s | OutbidInd",
  },

  description:
    "Discover businesses on OutbidInd, explore live listings and participate in real-time business auctions and bidding across India.",

  applicationName: "OutbidInd",

  keywords: [
    "business auction India",
    "business bidding platform India",
    "business auction marketplace",
    "online business auction",
    "live business auctions",
    "business bidding marketplace",
    "auction marketplace India",
  ],

  authors: [
    {
      name: "OutbidInd",
      url: "https://outbidind.com",
    },
  ],

  creator: "OutbidInd",
  publisher: "OutbidInd",

  alternates: {
    canonical: "https://outbidind.com",
  },

  openGraph: {
    type: "website",
    url: "https://outbidind.com",
    siteName: "OutbidInd",
    title:
      "OutbidInd – Business Auction & Bidding Marketplace in India",
    description:
      "Discover businesses, explore live listings and participate in real-time business auctions and bidding across India.",
    locale: "en_IN",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "OutbidInd – Business Auction & Bidding Marketplace",
      },
    ],
  },

  twitter: {
    card: "summary",
    title:
      "OutbidInd – Business Auction & Bidding Marketplace in India",
    description:
      "Discover businesses and participate in real-time business auctions and bidding across India.",
    images: ["/logo.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PagePreloader />
        {children}
        <TermsAcceptanceModal />
      </body>
    </html>
  );
}