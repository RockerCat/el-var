"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type CtxValue = {
  /** Href of the bottom-nav tab the user just tapped, while its content is still loading. */
  pendingHref: string | null;
  /** Called by BottomNav's onClick when a tab is tapped. */
  startTabTransition: (href: string) => void;
  /** Called by the destination tab's page once its real content has mounted. */
  markTabContentReady: () => void;
};

const TabNavigationContext = createContext<CtxValue>({
  pendingHref: null,
  startTabTransition: () => {},
  markTabContentReady: () => {},
});

// Safety net: if a destination page never signals "ready" (e.g. a tab
// redirects to a page that doesn't render TabReadySignal — admin/disabled/
// no-access edge cases), don't leave the skeleton stuck forever.
const READY_FALLBACK_MS = 8000;

export function TabNavigationProvider({ children }: { children: React.ReactNode }) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const startTabTransition = useCallback((href: string) => {
    setPendingHref(href);
  }, []);

  const markTabContentReady = useCallback(() => {
    setPendingHref(null);
  }, []);

  useEffect(() => {
    if (!pendingHref) return undefined;
    const timer = setTimeout(() => setPendingHref(null), READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [pendingHref]);

  return (
    <TabNavigationContext.Provider value={{ pendingHref, startTabTransition, markTabContentReady }}>
      {children}
    </TabNavigationContext.Provider>
  );
}

export function useTabNavigation(): CtxValue {
  return useContext(TabNavigationContext);
}
