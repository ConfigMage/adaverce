import type { Metadata, Viewport } from "next";
import { Archivo_Narrow, Special_Elite } from "next/font/google";
import "./globals.css";

const archivo = Archivo_Narrow({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const special = Special_Elite({
  variable: "--font-special",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Help Wanted: Writers' Room",
  description: "Private idea assistant for the Help Wanted Minecraft series.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ece6d6" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1814" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${special.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
