import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SeeMe: Real-Life Activity Meetups Near You',
  description:
    'Find 1-3 people nearby right now for over-the-board Chess, 1v1 Ping Pong, Tennis, Board Games, Basketball, Run Club, or Coffee.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SeeMe',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.className} bg-[#F8FAFC] text-[#0F172A] min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
