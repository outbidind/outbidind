import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Business Auctions & Bids in India",
  description:
    "Explore live business auctions on OutbidInd, compare current auction totals and discover businesses available for real-time bidding across India.",
  alternates: {
    canonical: "/live-bids",
  },

  openGraph: {
    type: "website",
    url: "/live-bids",
    siteName: "OutbidInd",
    title: "Live Business Auctions & Bids in India",
    description:
      "Explore live business auctions on OutbidInd and discover businesses available for real-time bidding across India.",
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
    title: "Live Business Auctions & Bids in India",
    description:
      "Explore live business auctions on OutbidInd and discover businesses available for real-time bidding across India.",
    images: ["/logo.png"],
  },
};

export default function LiveBidsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}