import type { Metadata } from 'next';

import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'StockFlow · Neon Inventory Workspace',
  description: 'Operational inventory dashboards powered by Drizzle ORM & Neon Postgres.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${GeistSans.variable} ${GeistMono.variable} h-full`} lang="en">
      <body className="flex min-h-full flex-col antialiased bg-[#f8f9fa] font-sans text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
