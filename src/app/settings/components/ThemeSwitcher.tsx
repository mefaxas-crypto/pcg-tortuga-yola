
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const themes = [
  { name: 'Bamboo', class: 'theme-bamboo', color: 'bg-[#8F9988]' },
  { name: 'Default', class: '', color: 'bg-primary' },
  // Add more themes here in the future
];

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [activeTheme, setActiveTheme] = useState('');

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('pcg-theme') || 'theme-bamboo';
    setActiveTheme(savedTheme);
    document.body.className = savedTheme;
  }, []);

  const handleThemeChange = (themeClass: string) => {
    setActiveTheme(themeClass);
    document.body.className = themeClass;
    localStorage.setItem('pcg-theme', themeClass);
  };

  if (!mounted) {
    return null; // or a skeleton loader
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Color Theme</h4>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((theme) => (
          <div key={theme.name} className="flex flex-col items-center gap-2">
            <Button
              variant={'outline'}
              className={cn(
                'h-12 w-full flex items-center justify-center',
                activeTheme === theme.class && 'border-primary border-2'
              )}
              onClick={() => handleThemeChange(theme.class)}
            >
              <div
                className={cn('h-6 w-6 rounded-full', theme.color)}
              />
            </Button>
            <span className="text-xs text-muted-foreground">{theme.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
