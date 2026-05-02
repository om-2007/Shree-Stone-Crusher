import type { Metadata, Viewport } from 'next';
import '../src/index.css';
import ServiceWorkerRegister from './ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Shree Stone Crusher',
  description: 'Shree Stone Crusher management dashboard',
  applicationName: 'Shree Stone Crusher',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Shree Stone',
  },
  icons: {
    apple: [
      { url: '/Shree Stone Crusher 192x192.png' },
      { url: '/Shree Stone Crusher 512x512.png', sizes: '512x512' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#F59E0B',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
