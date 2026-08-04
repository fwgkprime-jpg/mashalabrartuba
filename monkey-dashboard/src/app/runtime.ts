import { QueryClient } from '@tanstack/react-query';
import { createDashboardDataSource } from '../data';

export const dashboardDataSource = createDashboardDataSource();
export const dashboardQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
      networkMode: 'offlineFirst',
    },
    mutations: { retry: 0, networkMode: 'online' },
  },
});
