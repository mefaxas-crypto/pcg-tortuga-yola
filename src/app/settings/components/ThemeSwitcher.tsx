
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Theme {
  name: string;
  class: string;
  color: string;
}

const themes: Theme[] = [
  { name: 'Bamboo', class: 'theme-bamboo', color: 'bg-[#8F9988]' },
  { name: 'Default', class: '', color: 'bg-primary' },
];

interface ThemeSwitcherProps {
  value?: string;
  onChange: (value: string) => void;
}

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {themes.map((theme) => (
          <div key={theme.name} className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant={'outline'}
              className={cn(
                'h-12 w-full flex items-center justify-center',
                value === theme.class && 'border-primary border-2'
              )}
              onClick={() => onChange(theme.class)}
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
