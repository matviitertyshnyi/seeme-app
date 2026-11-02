import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Leave The Room — In-Person Activity Meetups Near You',
  description:
    'Stop sitting inside. Find 1-3 people nearby right now for sports, chess, outdoor games, coffee, and spontaneous in-person meetups.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Leave The Room',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('leavetheroom_theme')||localStorage.getItem('seeme_theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(d==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-canvas text-ink min-h-screen`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
