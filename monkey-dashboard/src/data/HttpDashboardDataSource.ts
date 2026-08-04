import { z } from 'zod';

import {
  ActivityEventSchema,
  ActivityQuerySchema,
  ActivityResponseSchema,
  CrabNoteDecisionResponseSchema,
  CrabNotesResponseSchema,
  CrabRecommendationDecisionResponseSchema,
  CrabRecommendationsResponseSchema,
  DiaryDetailResponseSchema,
  DiaryQuerySchema,
  DiaryResponseSchema,
  FixCodeDecisionResponseSchema,
  FixCodeResponseSchema,
  HealthResponseSchema,
  ManualDecisionRequestSchema,
  MonkeyCurrentResponseSchema,
  MonkeyRunDetailResponseSchema,
  MonkeyRunsResponseSchema,
  OrderHistoryDetailResponseSchema,
  OrderHistoryQuerySchema,
  OrderHistoryResponseSchema,
  SelectOrderOriginRequestSchema,
  SelectOrderOriginResponseSchema,
  StructureCurrentResponseSchema,
  SystemResourcesResponseSchema,
  SystemStatusResponseSchema,
  type ActivityQuery,
  type DiaryQuery,
  type ManualDecisionRequest,
  type OrderHistoryQuery,
  type SelectOrderOriginRequest,
} from '../domain/dashboardContracts';
import { NonEmptyStringSchema, Sha256Schema } from '../domain/monkeyContracts';
import type {
  DashboardDataSource,
  DashboardEventHandlers,
  UnsubscribeDashboardEvents,
} from './DashboardDataSource';

export class DashboardHttpError extends Error {
  readonly status: number;
  readonly endpoint: string;

  constructor(endpoint: string, status: number, statusText: string) {
    super(`Dashboard request failed (${status} ${statusText || 'Unknown status'})`);
    this.name = 'DashboardHttpError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

export class DashboardContractError extends Error {
  readonly endpoint: string;
  readonly issues: readonly z.core.$ZodIssue[];

  constructor(endpoint: string, issues: readonly z.core.$ZodIssue[]) {
    super(`Dashboard response did not match its contract: ${endpoint}`);
    this.name = 'DashboardContractError';
    this.endpoint = endpoint;
    this.issues = issues;
  }
}

export interface EventSourceLike {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  close(): void;
}

export type EventSourceFactory = (url: string) => EventSourceLike;

export interface HttpDashboardDataSourceOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  eventSourceFactory?: EventSourceFactory;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Dashboard API base URL must not be empty.');
  let parsed: URL;
  try {
    parsed = new URL(trimmed, 'https://dashboard.invalid');
  } catch {
    throw new Error('Dashboard API base URL is invalid.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Dashboard API base URL must use HTTP(S) or be same-origin relative.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Dashboard API base URL must not contain credentials, query data, or fragments.');
  }
  return trimmed.replace(/\/+$/, '');
}

function defaultEventSourceFactory(url: string): EventSourceLike {
  if (typeof EventSource === 'undefined') {
    throw new Error('EventSource is unavailable in this environment.');
  }
  return new EventSource(url);
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(NonEmptyStringSchema.parse(value));
}

function withQuery(
  path: string,
  query: Readonly<Record<string, string | number | undefined>>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

/** Fetch/SSE implementation for the future portable MONKEY backend. */
export class HttpDashboardDataSource implements DashboardDataSource {
  readonly mode = 'http' as const;

  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly eventSourceFactory: EventSourceFactory;

  constructor(options: HttpDashboardDataSourceOptions = {}) {
    // The value is the full prefix. `/api/v1` + `/health` => `/api/v1/health`.
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? '/api/v1');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.eventSourceFactory = options.eventSourceFactory ?? defaultEventSourceFactory;
  }

  getHealth(signal?: AbortSignal) {
    return this.get('/health', HealthResponseSchema, signal);
  }

  getSystemStatus(signal?: AbortSignal) {
    return this.get('/system/status', SystemStatusResponseSchema, signal);
  }

  getSystemResources(signal?: AbortSignal) {
    return this.get('/system/resources', SystemResourcesResponseSchema, signal);
  }

  getActivity(query: ActivityQuery = {}, signal?: AbortSignal) {
    const parsed = ActivityQuerySchema.parse(query);
    return this.get(
      withQuery('/activity', {
        cursor: parsed.cursor,
        limit: parsed.limit,
        severity: parsed.severity,
      }),
      ActivityResponseSchema,
      signal,
    );
  }

  getMonkeyCurrent(signal?: AbortSignal) {
    return this.get('/monkey/current', MonkeyCurrentResponseSchema, signal);
  }

  getMonkeyRuns(signal?: AbortSignal) {
    return this.get('/monkey/runs', MonkeyRunsResponseSchema, signal);
  }

  getMonkeyRun(run_id: string, signal?: AbortSignal) {
    return this.get(
      `/monkey/runs/${encodePathSegment(run_id)}`,
      MonkeyRunDetailResponseSchema,
      signal,
    );
  }

  getStructureCurrent(signal?: AbortSignal) {
    return this.get('/structure/current', StructureCurrentResponseSchema, signal);
  }

  getOrderHistory(query: OrderHistoryQuery = {}, signal?: AbortSignal) {
    const parsed = OrderHistoryQuerySchema.parse(query);
    return this.get(
      withQuery('/order-history', {
        asset: parsed.asset,
        since_utc: parsed.since_utc,
        horizon_hours: parsed.horizon_hours,
      }),
      OrderHistoryResponseSchema,
      signal,
    );
  }

  getOrderHistoryOrigin(origin_id: string, signal?: AbortSignal) {
    const id = Sha256Schema.parse(origin_id);
    return this.get(
      `/order-history/${encodeURIComponent(id)}`,
      OrderHistoryDetailResponseSchema,
      signal,
    );
  }

  selectOrderHistoryOrigin(
    origin_id: string,
    request: SelectOrderOriginRequest,
    signal?: AbortSignal,
  ) {
    const id = Sha256Schema.parse(origin_id);
    return this.request(
      `/order-history/${encodeURIComponent(id)}/select`,
      SelectOrderOriginResponseSchema,
      {
        method: 'POST',
        body: SelectOrderOriginRequestSchema.parse(request),
        signal,
      },
    );
  }

  getCrabRecommendations(signal?: AbortSignal) {
    return this.get('/crab/recommendations', CrabRecommendationsResponseSchema, signal);
  }

  decideCrabRecommendation(
    id: string,
    request: ManualDecisionRequest,
    signal?: AbortSignal,
  ) {
    return this.postDecision(
      `/crab/recommendations/${encodePathSegment(id)}/decision`,
      request,
      CrabRecommendationDecisionResponseSchema,
      signal,
    );
  }

  getCrabNotes(signal?: AbortSignal) {
    return this.get('/crab/notes', CrabNotesResponseSchema, signal);
  }

  decideCrabNote(id: string, request: ManualDecisionRequest, signal?: AbortSignal) {
    return this.postDecision(
      `/crab/notes/${encodePathSegment(id)}/decision`,
      request,
      CrabNoteDecisionResponseSchema,
      signal,
    );
  }

  getFixCode(signal?: AbortSignal) {
    return this.get('/fix-code', FixCodeResponseSchema, signal);
  }

  decideFixCode(id: string, request: ManualDecisionRequest, signal?: AbortSignal) {
    return this.postDecision(
      `/fix-code/${encodePathSegment(id)}/decision`,
      request,
      FixCodeDecisionResponseSchema,
      signal,
    );
  }

  getDiary(query: DiaryQuery = {}, signal?: AbortSignal) {
    const parsed = DiaryQuerySchema.parse(query);
    return this.get(
      withQuery('/diary', {
        query: parsed.query,
        date_from: parsed.date_from,
        date_to: parsed.date_to,
      }),
      DiaryResponseSchema,
      signal,
    );
  }

  getDiaryEntry(id: string, signal?: AbortSignal) {
    return this.get(`/diary/${encodePathSegment(id)}`, DiaryDetailResponseSchema, signal);
  }

  subscribeToEvents(
    handlers: DashboardEventHandlers,
    signal?: AbortSignal,
  ): UnsubscribeDashboardEvents {
    if (signal?.aborted) return () => undefined;

    const endpoint = this.endpoint('/events');
    const source = this.eventSourceFactory(endpoint);
    let closed = false;

    source.onopen = () => {
      if (!closed) handlers.onOpen?.();
    };
    source.onmessage = (message) => {
      if (closed) return;
      try {
        const parsedJson: unknown = JSON.parse(message.data);
        const parsed = ActivityEventSchema.safeParse(parsedJson);
        if (!parsed.success) {
          handlers.onError?.(new DashboardContractError(endpoint, parsed.error.issues));
          return;
        }
        handlers.onEvent(parsed.data);
      } catch (error) {
        handlers.onError?.(
          error instanceof Error ? error : new Error('Invalid dashboard SSE message.'),
        );
      }
    };
    source.onerror = () => {
      if (!closed) handlers.onError?.(new Error('Dashboard event stream is unavailable.'));
    };

    const unsubscribe = () => {
      if (closed) return;
      closed = true;
      source.onopen = null;
      source.onmessage = null;
      source.onerror = null;
      source.close();
      signal?.removeEventListener('abort', unsubscribe);
    };
    signal?.addEventListener('abort', unsubscribe, { once: true });
    return unsubscribe;
  }

  private get<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
    return this.request(path, schema, { method: 'GET', signal });
  }

  private postDecision<T>(
    path: string,
    request: ManualDecisionRequest,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    return this.request(path, schema, {
      method: 'POST',
      body: ManualDecisionRequestSchema.parse(request),
      signal,
    });
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: { method: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal },
  ): Promise<T> {
    const endpoint = this.endpoint(path);
    const response = await this.fetchImpl(endpoint, {
      method: options.method,
      signal: options.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    if (!response.ok) {
      // Do not echo response bodies: a backend error page may contain sensitive data.
      throw new DashboardHttpError(endpoint, response.status, response.statusText);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new DashboardContractError(endpoint, [
        {
          code: 'custom',
          input: undefined,
          path: [],
          message: 'Response was not valid JSON.',
        },
      ]);
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new DashboardContractError(endpoint, parsed.error.issues);
    return parsed.data;
  }

  private endpoint(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}
