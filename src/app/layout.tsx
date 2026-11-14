import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
const manrope = localFont({
  src: "../../public/fonts/manrope.ttf",
  variable: "--font-manrope",
  display: "swap",
});
export const metadata: Metadata = {
  title: "AETHER — Saturn Explorer",
  description:
    "A closer encounter with an extraordinary world. Explore Saturn, its rings, and three remarkable moons in an interactive 3D observatory.",
  applicationName: "AETHER",
  robots: { index: true, follow: true },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080b0e",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
