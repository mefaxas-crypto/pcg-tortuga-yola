
'use client';

import type { Outlet } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useAuth } from './AuthContext';

type OutletContextType = {
  selectedOutlet: Outlet | null;
  setSelectedOutlet: (outlet: Outlet | null) => void;
  outlets: Outlet[];
};

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export const OutletProvider = ({ children }: { children: ReactNode }) => {
  const { firestore } = useFirebase();
  const { appUser } = useAuth();
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  const outletsQuery = useMemoFirebase(
    () => query(collection(firestore, 'outlets'), orderBy('name', 'asc')),
    [firestore]
  );
  const { data: outlets, isLoading } = useCollection<Outlet>(outletsQuery);

  const outletList = useMemo(() => outlets || [], [outlets]);

  useEffect(() => {
    if (isLoading || outletList.length === 0) return;

    // If a user is logged in and assigned to a specific outlet, set that one.
    if (appUser && appUser.outletId) {
      const assignedOutlet = outletList.find(o => o.id === appUser.outletId);
      if (assignedOutlet) {
        setSelectedOutlet(assignedOutlet);
        return;
      }
    }

    // If no outlet is selected yet (or the assigned one wasn't found), set a default.
    if (!selectedOutlet) {
      const bambooOutlet = outletList.find(o => o.name === "Restaurante Bamboo");
      if (bambooOutlet) {
        setSelectedOutlet(bambooOutlet);
      } else {
        setSelectedOutlet(outletList[0]);
      }
    }
  }, [isLoading, outletList, selectedOutlet, appUser?.outletId]);


  const value = useMemo(() => ({
    selectedOutlet,
    setSelectedOutlet,
    outlets: outletList,
  }), [selectedOutlet, outletList]);

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
