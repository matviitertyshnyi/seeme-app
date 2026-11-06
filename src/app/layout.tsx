import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://leavetheroom.tech'),
  title: {
    default: 'Leave The Room - Real-World Local Meetups',
    template: '%s | Leave The Room',
  },
  description:
    'Stop sitting inside. Find 1-3 people nearby right now for sports, chess, outdoor games, coffee, and spontaneous in-person meetups.',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Leave The Room',
  },
  openGraph: {
    title: 'Leave The Room - Real-World Local Meetups',
    description:
      'Stop sitting inside. Find 1-3 people nearby right now for sports, chess, outdoor games, coffee, and spontaneous in-person meetups.',
    url: 'https://leavetheroom.tech',
    siteName: 'Leave The Room',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leave The Room - Real-World Local Meetups',
    description:
      'Stop sitting inside. Find 1-3 people nearby right now for sports, chess, outdoor games, coffee, and spontaneous in-person meetups.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('leavetheroom_theme')||localStorage.getItem('seeme_theme')||'dark';if(d==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-canvas text-ink min-h-screen`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
