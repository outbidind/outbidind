import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "List Your Business for Auction in India",
  description:
    "List your business on OutbidInd and reach users interested in real-time business auctions and competitive bidding across India.",
  alternates: {
    canonical: "/list-your-business",
  },

  openGraph: {
    type: "website",
    url: "/list-your-business",
    siteName: "OutbidInd",
    title: "List Your Business for Auction in India",
    description:
      "List your business on OutbidInd and make it available for real-time business auctions and competitive bidding across India.",
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
    title: "List Your Business for Auction in India",
    description:
      "List your business on OutbidInd and reach users through real-time business auctions and competitive bidding.",
    images: ["/logo.png"],
  },
};

export default function ListYourBusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}