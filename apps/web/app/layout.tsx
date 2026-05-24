import type { Metadata } from "next";
import { getEnv } from "@cloud/config";
import { ClientToaster } from "./_components/client-toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloud Frontend Scaffold",
  description: "Scaffold with baseline admin shell, auth, and Prisma models.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const env = getEnv();

  return (
    <html lang="zh-CN">
      <body data-app-name={env.NEXT_PUBLIC_APP_NAME}>
        {children}
        <ClientToaster />
      </body>
    </html>
  );
}
