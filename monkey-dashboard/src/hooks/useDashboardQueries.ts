import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useDashboardDataSource } from '../app/DataSourceProvider';
import { useDashboardSettings } from '../app/settings';
import type {
  ActivityQuery,
  ActivityResponse,
  DiaryQuery,
  ManualDecisionRequest,
  OrderHistoryQuery,
  SelectOrderOriginRequest,
} from '../domain/dashboardContracts';

export const queryKeys = {
  health: ['health'] as const,
  systemStatus: ['system', 'status'] as const,
  systemResources: ['system', 'resources'] as const,
  activity: (query: ActivityQuery = {}) => ['activity', query] as const,
  monkeyCurrent: ['monkey', 'current'] as const,
  monkeyRuns: ['monkey', 'runs'] as const,
  monkeyRun: (runId: string) => ['monkey', 'runs', runId] as const,
  structure: ['structure', 'current'] as const,
  orderHistory: (query: OrderHistoryQuery = {}) => ['order-history', query] as const,
  orderOrigin: (originId: string) => ['order-history', 'origin', originId] as const,
  recommendations: ['crab', 'recommendations'] as const,
  notes: ['crab', 'notes'] as const,
  fixes: ['fix-code'] as const,
  diary: (query: DiaryQuery = {}) => ['diary', query] as const,
  diaryEntry: (id: string) => ['diary', id] as const,
};

function useRefreshInterval(): number {
  return useDashboardSettings().refreshIntervalMs;
}

export function useHealthQuery() {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.health, queryFn: ({ signal }) => source.getHealth(signal), refetchInterval: useRefreshInterval() });
}

export function useSystemStatusQuery() {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.systemStatus, queryFn: ({ signal }) => source.getSystemStatus(signal), refetchInterval: useRefreshInterval() });
}

export function useSystemResourcesQuery() {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.systemResources, queryFn: ({ signal }) => source.getSystemResources(signal), refetchInterval: useRefreshInterval() });
}

export function useActivityQuery(query: ActivityQuery = {}) {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.activity(query), queryFn: ({ signal }) => source.getActivity(query, signal), refetchInterval: useRefreshInterval() });
}

export function useMonkeyCurrentQuery() {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.monkeyCurrent, queryFn: ({ signal }) => source.getMonkeyCurrent(signal), refetchInterval: useRefreshInterval() });
}

export function useMonkeyRunsQuery() {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.monkeyRuns, queryFn: ({ signal }) => source.getMonkeyRuns(signal), refetchInterval: useRefreshInterval() });
}

export function useMonkeyRunQuery(runId: string | null) {
  const source = useDashboardDataSource();
  return useQuery({
    queryKey: queryKeys.monkeyRun(runId ?? 'none'),
    queryFn: ({ signal }) => source.getMonkeyRun(runId!, signal),
    enabled: Boolean(runId),
  });
}

export function useStructureQuery() {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.structure, queryFn: ({ signal }) => source.getStructureCurrent(signal), refetchInterval: useRefreshInterval() });
}

export function useOrderHistoryQuery(query: OrderHistoryQuery = {}) {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.orderHistory(query), queryFn: ({ signal }) => source.getOrderHistory(query, signal), refetchInterval: useRefreshInterval() });
}

export function useOrderOriginQuery(originId: string | null) {
  const source = useDashboardDataSource();
  return useQuery({
    queryKey: queryKeys.orderOrigin(originId ?? 'none'),
    queryFn: ({ signal }) => source.getOrderHistoryOrigin(originId!, signal),
    enabled: Boolean(originId),
  });
}

export function useSelectOrderOriginMutation() {
  const source = useDashboardDataSource();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ originId, request }: { originId: string; request: SelectOrderOriginRequest }) =>
      source.selectOrderHistoryOrigin(originId, request),
    onSuccess: (response) => {
      void client.invalidateQueries({ queryKey: ['order-history'] });
      client.setQueryData(queryKeys.orderOrigin(response.origin.origin_id), {
        meta: response.meta,
        origin: response.origin,
        fortnite_context: null,
        monkey_public_result: null,
      });
    },
  });
}

export function useRecommendationsQuery() {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.recommendations, queryFn: ({ signal }) => source.getCrabRecommendations(signal), refetchInterval: useRefreshInterval() });
}

export function useRecommendationDecisionMutation() {
  const source = useDashboardDataSource();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ManualDecisionRequest }) => source.decideCrabRecommendation(id, request),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.recommendations }),
  });
}

export function useNotesQuery() {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.notes, queryFn: ({ signal }) => source.getCrabNotes(signal), refetchInterval: useRefreshInterval() });
}

export function useNoteDecisionMutation() {
  const source = useDashboardDataSource();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ManualDecisionRequest }) => source.decideCrabNote(id, request),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.notes }),
  });
}

export function useFixCodeQuery() {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.fixes, queryFn: ({ signal }) => source.getFixCode(signal), refetchInterval: useRefreshInterval() });
}

export function useFixDecisionMutation() {
  const source = useDashboardDataSource();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ManualDecisionRequest }) => source.decideFixCode(id, request),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.fixes }),
  });
}

export function useDiaryQuery(query: DiaryQuery = {}) {
  const source = useDashboardDataSource();
  return useQuery({ queryKey: queryKeys.diary(query), queryFn: ({ signal }) => source.getDiary(query, signal), refetchInterval: useRefreshInterval() });
}

export function useDiaryEntryQuery(id: string | null) {
  const source = useDashboardDataSource();
  return useQuery({
    queryKey: queryKeys.diaryEntry(id ?? 'none'),
    queryFn: ({ signal }) => source.getDiaryEntry(id!, signal),
    enabled: Boolean(id),
  });
}

function prependLiveEvent(client: QueryClient, event: ActivityResponse['items'][number]) {
  client.setQueriesData<ActivityResponse>({ queryKey: ['activity'] }, (current) => {
    if (!current || current.items.some((item) => item.id === event.id)) return current;
    return { ...current, items: [event, ...current.items].slice(0, 200) };
  });
}

export function DashboardEventsBridge() {
  const source = useDashboardDataSource();
  const client = useQueryClient();

  useEffect(() => {
    const controller = new AbortController();
    const unsubscribe = source.subscribeToEvents(
      {
        onEvent: (event) => prependLiveEvent(client, event),
        onError: () => void client.invalidateQueries({ queryKey: ['activity'] }),
      },
      controller.signal,
    );
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [client, source]);

  return null;
}
