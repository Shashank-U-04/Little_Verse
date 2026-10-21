import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LittleVerse AI \u2014 Jungle Counting Adventure",
  description: "Interactive counting adventure for ages 4-6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${nunito.variable} antialiased`}>
      <body className={`${nunito.variable} antialiased min-h-screen bg-cream`}>
        {children}
      </body>
    </html>
  );
}
