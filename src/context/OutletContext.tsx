'use client';

import type { Outlet } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

type OutletContextType = {
  selectedOutlet: Outlet | null;
  setSelectedOutlet: (outlet: Outlet | null) => void;
  outlets: Outlet[];
  setOutlets: (outlets: Outlet[]) => void;
};

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export const OutletProvider = ({ children }: { children: ReactNode }) => {
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);

  const value = useMemo(() => ({
    selectedOutlet,
    setSelectedOutlet,
    outlets,
    setOutlets
  }), [selectedOutlet, outlets]);

  return (
    <OutletContext.Provider value={value}>
      {children}
    </OutletContext.Provider>
  );
};

export const useOutletContext = () => {
  const context = useContext(OutletContext);
  if (context === undefined) {
    throw new Error('useOutletContext must be used within an OutletProvider');
  }
  return context;
};
