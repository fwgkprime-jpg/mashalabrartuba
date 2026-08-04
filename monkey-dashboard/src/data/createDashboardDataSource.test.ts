import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpDashboardDataSource } from './HttpDashboardDataSource';
import { MockDashboardDataSource } from './MockDashboardDataSource';
import { createDashboardDataSource } from './createDashboardDataSource';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createDashboardDataSource', () => {
  it('creates the mock adapter explicitly', () => {
    const source = createDashboardDataSource({ mode: 'mock', mock: { latencyMs: 0 } });
    expect(source).toBeInstanceOf(MockDashboardDataSource);
    expect(source.mode).toBe('mock');
  });

  it('creates the HTTP adapter explicitly', () => {
    const source = createDashboardDataSource({
      mode: 'http',
      apiBaseUrl: '/api/v1',
      http: { fetchImpl: vi.fn() as unknown as typeof fetch },
    });
    expect(source).toBeInstanceOf(HttpDashboardDataSource);
    expect(source.mode).toBe('http');
  });

  it('maps VITE_DATA_MODE=api to the HTTP adapter', () => {
    vi.stubEnv('VITE_DATA_MODE', 'api');
    vi.stubEnv('VITE_API_BASE_URL', '/api/v1');
    const source = createDashboardDataSource({
      http: { fetchImpl: vi.fn() as unknown as typeof fetch },
    });
    expect(source).toBeInstanceOf(HttpDashboardDataSource);
  });

  it('rejects an unknown data mode instead of silently showing mock data', () => {
    vi.stubEnv('VITE_DATA_MODE', 'surprise');
    expect(() => createDashboardDataSource()).toThrow(/unsupported VITE_DATA_MODE/i);
  });
});
