"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type CtxValue = {
  /** Called by each CalendarMatchRow to register/unregister its editing state. */
  registerEditing: (matchId: string, editing: boolean) => void;
  /** True when at least one prediction form is open. */
  isAnyEditing: boolean;
};

const PredictionEditingContext = createContext<CtxValue>({
  registerEditing: () => {},
  isAnyEditing: false,
});

export function PredictionEditingProvider({ children }: { children: React.ReactNode }) {
  // Track which match IDs currently have an open form.
  const editingSet = useRef(new Set<string>());
  const [isAnyEditing, setIsAnyEditing] = useState(false);

  const registerEditing = useCallback((matchId: string, editing: boolean) => {
    if (editing) {
      editingSet.current.add(matchId);
    } else {
      editingSet.current.delete(matchId);
    }
    setIsAnyEditing(editingSet.current.size > 0);
  }, []);

  return (
    <PredictionEditingContext.Provider value={{ registerEditing, isAnyEditing }}>
      {children}
    </PredictionEditingContext.Provider>
  );
}

export function usePredictionEditing(): CtxValue {
  return useContext(PredictionEditingContext);
}
