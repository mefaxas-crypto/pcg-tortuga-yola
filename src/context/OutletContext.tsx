"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Outlet } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

// Shape inferred from usages across the codebase
// - outlets: list of Outlet
// - selectedOutlet: currently chosen outlet or null
// - setSelectedOutlet: function to set it
// - isLoading: loading state for initial fetch
// Additional extension points: refresh() to refetch outlets

interface OutletContextValue {
  outlets: Outlet[];
  selectedOutlet: Outlet | null;
  setSelectedOutlet: (outlet: Outlet | null) => void;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const OutletContext = createContext<OutletContextValue | undefined>(undefined);

export const OutletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appUser } = useAuth();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOutlets = useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    try {
      // Basic fetch: all outlets owned by this user (or adjust logic later)
      const q = query(collection(db, 'outlets'), where('userId', '==', appUser.uid));
      const snapshot = await getDocs(q);
      const data: Outlet[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Outlet, 'id'>) }));
      setOutlets(data);
      // Ensure selected outlet remains valid or pick first
      setSelectedOutlet(prev => {
        if (prev && data.some(o => o.id === prev.id)) return prev;
        return data[0] ?? null;
      });
    } catch (e) {
      console.error('Failed to fetch outlets', e);
    } finally {
      setIsLoading(false);
    }
  }, [appUser]);

  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

  const value: OutletContextValue = {
    outlets,
    selectedOutlet,
    setSelectedOutlet,
    isLoading,
    refresh: fetchOutlets,
  };

  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>;
};

export function useOutletContext(): OutletContextValue {
  const ctx = useContext(OutletContext);
  if (!ctx) throw new Error('useOutletContext must be used within an OutletProvider');
  return ctx;
}
