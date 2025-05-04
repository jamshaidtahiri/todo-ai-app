import { Inter } from 'next/font/google';
import './globals.css';
import type { Metadata, Viewport } from 'next';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AI To-Do | Smart Task Management',
  description: 'A smart task management app powered by AI to help organize and classify your tasks.',
  keywords: ['todo', 'AI', 'task management', 'productivity'],
  authors: [{ name: 'AI To-Do Team' }],
  icons: {
    icon: '/favicon.ico',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
