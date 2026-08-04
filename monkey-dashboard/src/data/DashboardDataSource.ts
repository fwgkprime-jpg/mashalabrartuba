import type {
  ActivityEvent,
  ActivityQuery,
  ActivityResponse,
  CrabNoteDecisionResponse,
  CrabNotesResponse,
  CrabRecommendationDecisionResponse,
  CrabRecommendationsResponse,
  DiaryDetailResponse,
  DiaryQuery,
  DiaryResponse,
  FixCodeDecisionResponse,
  FixCodeResponse,
  HealthResponse,
  ManualDecisionRequest,
  MonkeyCurrentResponse,
  MonkeyRunDetailResponse,
  MonkeyRunsResponse,
  OrderHistoryDetailResponse,
  OrderHistoryQuery,
  OrderHistoryResponse,
  SelectOrderOriginRequest,
  SelectOrderOriginResponse,
  StructureCurrentResponse,
  SystemResourcesResponse,
  SystemStatusResponse,
} from '../domain/dashboardContracts';

export type DashboardDataMode = 'mock' | 'http';

export interface DashboardEventHandlers {
  onEvent: (event: ActivityEvent) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
}

export type UnsubscribeDashboardEvents = () => void;

/**
 * UI-facing data port. Every Promise-returning method accepts AbortSignal so
 * TanStack Query can cancel obsolete work without coupling UI to fetch.
 */
export interface DashboardDataSource {
  readonly mode: DashboardDataMode;

  getHealth(signal?: AbortSignal): Promise<HealthResponse>;
  getSystemStatus(signal?: AbortSignal): Promise<SystemStatusResponse>;
  getSystemResources(signal?: AbortSignal): Promise<SystemResourcesResponse>;
  getActivity(query?: ActivityQuery, signal?: AbortSignal): Promise<ActivityResponse>;

  getMonkeyCurrent(signal?: AbortSignal): Promise<MonkeyCurrentResponse>;
  getMonkeyRuns(signal?: AbortSignal): Promise<MonkeyRunsResponse>;
  getMonkeyRun(run_id: string, signal?: AbortSignal): Promise<MonkeyRunDetailResponse>;

  getStructureCurrent(signal?: AbortSignal): Promise<StructureCurrentResponse>;

  getOrderHistory(
    query?: OrderHistoryQuery,
    signal?: AbortSignal,
  ): Promise<OrderHistoryResponse>;
  getOrderHistoryOrigin(
    origin_id: string,
    signal?: AbortSignal,
  ): Promise<OrderHistoryDetailResponse>;
  selectOrderHistoryOrigin(
    origin_id: string,
    request: SelectOrderOriginRequest,
    signal?: AbortSignal,
  ): Promise<SelectOrderOriginResponse>;

  getCrabRecommendations(signal?: AbortSignal): Promise<CrabRecommendationsResponse>;
  decideCrabRecommendation(
    id: string,
    request: ManualDecisionRequest,
    signal?: AbortSignal,
  ): Promise<CrabRecommendationDecisionResponse>;

  getCrabNotes(signal?: AbortSignal): Promise<CrabNotesResponse>;
  decideCrabNote(
    id: string,
    request: ManualDecisionRequest,
    signal?: AbortSignal,
  ): Promise<CrabNoteDecisionResponse>;

  getFixCode(signal?: AbortSignal): Promise<FixCodeResponse>;
  decideFixCode(
    id: string,
    request: ManualDecisionRequest,
    signal?: AbortSignal,
  ): Promise<FixCodeDecisionResponse>;

  getDiary(query?: DiaryQuery, signal?: AbortSignal): Promise<DiaryResponse>;
  getDiaryEntry(id: string, signal?: AbortSignal): Promise<DiaryDetailResponse>;

  subscribeToEvents(
    handlers: DashboardEventHandlers,
    signal?: AbortSignal,
  ): UnsubscribeDashboardEvents;
}
