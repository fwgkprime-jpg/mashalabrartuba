import type { DashboardDataMode, DashboardDataSource } from './DashboardDataSource';
import {
  HttpDashboardDataSource,
  type HttpDashboardDataSourceOptions,
} from './HttpDashboardDataSource';
import {
  MockDashboardDataSource,
  type MockDashboardDataSourceOptions,
} from './MockDashboardDataSource';
import { OrderSelectionRepository } from './OrderSelectionRepository';

export interface DashboardDataSourceFactoryOptions {
  mode?: DashboardDataMode;
  apiBaseUrl?: string;
  selectionRepository?: OrderSelectionRepository;
  mock?: Omit<MockDashboardDataSourceOptions, 'selectionRepository'>;
  http?: Omit<HttpDashboardDataSourceOptions, 'baseUrl'>;
}

function configuredMode(explicit?: DashboardDataMode): DashboardDataMode {
  const raw = explicit ?? import.meta.env.VITE_DATA_MODE ?? 'mock';
  const normalized = raw.trim().toLocaleLowerCase();
  if (normalized === 'mock') return 'mock';
  if (normalized === 'api' || normalized === 'http' || normalized === 'real') return 'http';
  throw new Error(`Unsupported VITE_DATA_MODE: ${raw}`);
}

/**
 * Selects the isolated adapter. `VITE_API_BASE_URL` is the complete API
 * prefix (`/api/v1`), not a host to which this factory adds another version.
 */
export function createDashboardDataSource(
  options: DashboardDataSourceFactoryOptions = {},
): DashboardDataSource {
  const mode = configuredMode(options.mode);
  if (mode === 'http') {
    return new HttpDashboardDataSource({
      ...options.http,
      baseUrl: options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
    });
  }
  return new MockDashboardDataSource({
    ...options.mock,
    selectionRepository: options.selectionRepository ?? new OrderSelectionRepository(),
  });
}
