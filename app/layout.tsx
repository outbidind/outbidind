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
  title: "OutbidInd",
  description: "A thoughtful marketplace for business opportunity.",
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