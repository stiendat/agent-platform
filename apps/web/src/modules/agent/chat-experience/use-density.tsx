/* eslint-disable react-refresh/only-export-components -- DensityProvider and useDensity are co-located by design; splitting them would force consumers through a pointless re-export shim */
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

export type Density = 'concise' | 'detailed';

const STORAGE_KEY = 'seta.agent.density';

function readInitial(): Density {
  if (typeof localStorage === 'undefined') return 'concise';
  return localStorage.getItem(STORAGE_KEY) === 'detailed' ? 'detailed' : 'concise';
}

interface DensityValue {
  density: Density;
  setDensity: (d: Density) => void;
}

const DensityContext = createContext<DensityValue | null>(null);

export function DensityProvider({
  children,
  forceDetailed = false,
}: {
  children: ReactNode;
  /**
   * When true, density is pinned to 'detailed' (reasoning + tool calls expanded)
   * and the user toggle is inert. Set by the deployment-wide
   * `force_expand_reasoning` global flag.
   */
  forceDetailed?: boolean;
}) {
  const [density, setDensityState] = useState<Density>(readInitial);
  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    try {
      localStorage.setItem(STORAGE_KEY, d);
    } catch {
      // private mode / disabled storage: in-memory only
    }
  }, []);
  const value = useMemo<DensityValue>(
    () => (forceDetailed ? { density: 'detailed', setDensity: () => {} } : { density, setDensity }),
    [forceDetailed, density, setDensity],
  );
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

/** Default to concise when no provider is mounted (e.g. isolated renders). */
export function useDensity(): DensityValue {
  return useContext(DensityContext) ?? { density: 'concise', setDensity: () => {} };
}
