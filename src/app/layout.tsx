
'use client';

import { Inter, Playfair_Display } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { cn } from '@/lib/utils';
import { OutletProvider, useOutletContext } from '@/context/OutletContext';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { Header } from '@/components/layout/Header';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';
import { useEffect } from 'react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair-display',
});

type Props = {
  children: React.ReactNode;
};

const THEMES = ['theme-bamboo', 'theme-ocean'];

function ThemedLayout({ children }: { children: React.ReactNode }) {
  const { selectedOutlet } = useOutletContext();

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all possible theme classes
    root.classList.remove(...THEMES);
    
    // Determine the new theme, defaulting to 'theme-bamboo'
    const theme = selectedOutlet?.theme || 'theme-bamboo';
    
    // Add the new theme class if it's not the default (empty string)
    if (theme) {
      root.classList.add(theme);
    }
  }, [selectedOutlet]);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfairDisplay.variable}`}
    >
      <head>
        <title>PCG Kitchen Manager</title>
        <meta
          name="description"
          content="A comprehensive kitchen management system."
        />
      </head>
      <body className={cn('font-body antialiased min-h-screen')}>
        <SidebarProvider>
          <Sidebar>
            <SidebarNav />
          </Sidebar>
          <SidebarInset>
            <Header />
            <main className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</main>
          </SidebarInset>
          <Toaster />
        </SidebarProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}


export default function RootLayout({ children }: Props) {
  return (
    <AuthProvider>
      <OutletProvider>
        <ThemedLayout>
            {children}
        </ThemedLayout>
      </OutletProvider>
    </AuthProvider>
  );
}
