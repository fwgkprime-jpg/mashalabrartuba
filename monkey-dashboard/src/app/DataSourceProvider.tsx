import { createContext, useContext, type ReactNode } from 'react';
import type { DashboardDataSource } from '../data/DashboardDataSource';

const DataSourceContext = createContext<DashboardDataSource | null>(null);

export function DataSourceProvider({ source, children }: { source: DashboardDataSource; children: ReactNode }) {
  return <DataSourceContext.Provider value={source}>{children}</DataSourceContext.Provider>;
}

// This hook is intentionally colocated with its provider as one transport boundary.
// eslint-disable-next-line react-refresh/only-export-components
export function useDashboardDataSource(): DashboardDataSource {
  const source = useContext(DataSourceContext);
  if (!source) throw new Error('useDashboardDataSource must be used inside DataSourceProvider');
  return source;
}

