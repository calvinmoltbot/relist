"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface HelpState {
  dismissedHints: Set<string>;
}

interface HelpContextValue extends HelpState {
  dismissHint: (id: string) => void;
  isHintVisible: (id: string) => boolean;
  resetHints: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

const STORAGE_KEY = "relist-help";

export function HelpProvider({ children }: { children: ReactNode }) {
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(
    new Set()
  );
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDismissedHints(new Set(parsed.dismissedHints ?? []));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((hints: Set<string>) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dismissedHints: [...hints] })
      );
    } catch {
      // ignore
    }
  }, []);

  const dismissHint = useCallback(
    (id: string) => {
      setDismissedHints((prev) => {
        const next = new Set(prev).add(id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const isHintVisible = useCallback(
    (id: string) => loaded && !dismissedHints.has(id),
    [dismissedHints, loaded]
  );

  const resetHints = useCallback(() => {
    setDismissedHints(new Set());
    persist(new Set());
  }, [persist]);

  return (
    <HelpContext.Provider
      value={{ dismissedHints, dismissHint, isHintVisible, resetHints }}
    >
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp must be used within HelpProvider");
  return ctx;
}
