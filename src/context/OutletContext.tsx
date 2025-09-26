
'use client';

import type { Outlet } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

type OutletContextType = {
  selectedOutlet: Outlet | null;
  setSelectedOutlet: (outlet: Outlet | null) => void;
  outlets: Outlet[];
  setOutlets: (outlets: Outlet[]) => void;
};

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export const OutletProvider = ({ children }: { children: ReactNode }) => {
  const { firestore } = useFirebase();
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);

  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'outlets'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Outlet[] = [];
        snapshot.forEach((doc) =>
          data.push({ id: doc.id, ...doc.data() } as Outlet)
        );
        const sortedOutlets = data.sort((a, b) => a.name.localeCompare(b.name));
        setOutlets(sortedOutlets);

        if (!selectedOutlet) {
            // Find and set "Restaurante Bamboo" as the default outlet.
            const bambooOutlet = sortedOutlets.find(o => o.name === "Restaurante Bamboo");
            if (bambooOutlet) {
              setSelectedOutlet(bambooOutlet);
            } else if (sortedOutlets.length > 0) {
              // Fallback to the first outlet if Bamboo is not found
              setSelectedOutlet(sortedOutlets[0]);
            }
        }
      },
      (error) => {
        console.error('Error fetching outlets:', error);
      }
    );
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);


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
