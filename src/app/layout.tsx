import type { Metadata, Viewport } from "next";
import { MusicPlayer } from "@/components/layout/MusicPlayer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dead Signal",
  description: "Cooperative survival horror in your browser.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        <MusicPlayer />
      </body>
    </html>
  );
}
