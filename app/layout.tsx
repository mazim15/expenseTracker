import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import "./globals.css";
import { AuthProvider } from './context/AuthContext';
import DarkModeScript from './components/DarkModeScript';

// Initialize the fonts
const sans = GeistSans
const mono = GeistMono

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track and manage your expenses easily",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${sans.variable} ${mono.variable}`}>
        <AuthProvider>
          <DarkModeScript />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
