import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ActivityEvent } from '../domain/dashboardContracts';
import {
  DashboardContractError,
  DashboardHttpError,
  HttpDashboardDataSource,
  type EventSourceLike,
} from './HttpDashboardDataSource';

const timestamp = '2026-08-01T12:00:00.000Z';

function response(payload: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => payload,
  } as Response;
}

function healthPayload() {
  return {
    meta: {
      data_mode: 'http',
      demo_data: false,
      observed_at_utc: timestamp,
      stale: false,
    },
    status: 'ONLINE',
    service: 'monkey-dashboard-api',
    version: 'v1',
    checked_at_utc: timestamp,
  };
}

function activityPayload(): ActivityEvent {
  return {
    id: 'event-1',
    run_id: 'run-1',
    sequence: 1,
    kind: 'STAGE_COMPLETED',
    occurred_at_utc: timestamp,
    severity: 'success',
    title: 'Stage complete',
    message: 'Safe event projection.',
    stage: 'FINALIZE',
    status: 'COMPLETE',
    related_id: null,
  };
}

class FakeEventSource implements EventSourceLike {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  close(): void {
    this.closed = true;
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('HttpDashboardDataSource', () => {
  it('treats the configured base as the complete /api/v1 prefix', async () => {
    const fetchImpl = vi.fn(async () => response(healthPayload())) as unknown as typeof fetch;
    const source = new HttpDashboardDataSource({ baseUrl: '/api/v1/', fetchImpl });

    await expect(source.getHealth()).resolves.toMatchObject({ status: 'ONLINE' });
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('rejects credential-bearing API base URLs', () => {
    expect(
      () => new HttpDashboardDataSource({ baseUrl: 'https://user:secret@example.test/api/v1' }),
    ).toThrow(/must not contain credentials/i);
  });

  it('surfaces an unavailable backend without reading its response body', async () => {
    const fetchImpl = vi.fn(async () => response({}, 503, 'Unavailable')) as unknown as typeof fetch;
    const source = new HttpDashboardDataSource({ fetchImpl });

    await expect(source.getHealth()).rejects.toMatchObject({
      name: 'DashboardHttpError',
      status: 503,
    } satisfies Partial<DashboardHttpError>);
  });

  it('forwards AbortSignal and rejects cancelled work', async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    ) as unknown as typeof fetch;
    const source = new HttpDashboardDataSource({ fetchImpl });
    const controller = new AbortController();

    const pending = source.getHealth(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('throws DashboardContractError for malformed JSON payload shape', async () => {
    const source = new HttpDashboardDataSource({
      fetchImpl: vi.fn(async () => response({ status: 'ONLINE' })) as unknown as typeof fetch,
    });

    await expect(source.getHealth()).rejects.toBeInstanceOf(DashboardContractError);
  });

  it('validates POST request bodies before fetch', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const source = new HttpDashboardDataSource({ fetchImpl });

    expect(() =>
      source.decideCrabNote('note-1', { decision: 'MAYBE' } as never),
    ).toThrowError(expect.objectContaining({ name: 'ZodError' }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('validates SSE events and closes the stream on unsubscribe', () => {
    const stream = new FakeEventSource();
    const onEvent = vi.fn();
    const onError = vi.fn();
    const source = new HttpDashboardDataSource({ eventSourceFactory: () => stream });
    const unsubscribe = source.subscribeToEvents({ onEvent, onError });

    stream.onmessage?.({ data: JSON.stringify(activityPayload()) } as MessageEvent<string>);
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 'event-1' }));
    expect(onError).not.toHaveBeenCalled();

    unsubscribe();
    expect(stream.closed).toBe(true);
    expect(stream.onmessage).toBeNull();
  });

  it('routes malformed SSE events to the contract error handler', () => {
    const stream = new FakeEventSource();
    const onError = vi.fn();
    const source = new HttpDashboardDataSource({ eventSourceFactory: () => stream });
    const unsubscribe = source.subscribeToEvents({ onEvent: vi.fn(), onError });

    stream.onmessage?.({ data: JSON.stringify({ id: 'incomplete' }) } as MessageEvent<string>);
    expect(onError).toHaveBeenCalledWith(expect.any(DashboardContractError));
    unsubscribe();
  });
});
