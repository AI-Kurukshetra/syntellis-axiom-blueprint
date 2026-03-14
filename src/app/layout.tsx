import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
