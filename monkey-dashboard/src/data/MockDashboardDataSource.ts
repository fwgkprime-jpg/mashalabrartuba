import {
  ActivityEventSchema,
  ActivityQuerySchema,
  ActivityResponseSchema,
  CrabNoteDecisionResponseSchema,
  CrabNoteSchema,
  CrabNotesResponseSchema,
  CrabRecommendationDecisionResponseSchema,
  CrabRecommendationSchema,
  CrabRecommendationsResponseSchema,
  DEMO_DATA_LABEL,
  DiaryDetailResponseSchema,
  DiaryEntrySchema,
  DiaryQuerySchema,
  DiaryResponseSchema,
  FixCodeDecisionResponseSchema,
  FixCodeProposalSchema,
  FixCodeResponseSchema,
  HealthResponseSchema,
  ManualDecisionRequestSchema,
  MockOnlyExtensionSchema,
  MonkeyCurrentResponseSchema,
  MonkeyRunDetailResponseSchema,
  MonkeyRunsResponseSchema,
  OrderHistoryDetailResponseSchema,
  OrderHistoryOriginSchema,
  OrderHistoryQuerySchema,
  OrderHistoryResponseSchema,
  SelectOrderOriginRequestSchema,
  SelectOrderOriginResponseSchema,
  StructureCurrentResponseSchema,
  SystemResourcesResponseSchema,
  SystemStatusResponseSchema,
  type ActivityEvent,
  type ActivityQuery,
  type CrabNote,
  type CrabRecommendation,
  type DiaryEntry,
  type DiaryQuery,
  type FixCodeProposal,
  type ManualDecisionRequest,
  type OrderHistoryOrigin,
  type OrderHistoryQuery,
  type SelectOrderOriginRequest,
} from '../domain/dashboardContracts';
import {
  MonkeyCheckpointSchema,
  MonkeyJointPublicResultSchema,
  MonkeyPublicationDecisionSchema,
  MonkeyRunManifestSchema,
  type MonkeyCheckpoint,
  type MonkeyJointPublicResult,
  type MonkeyPublicationDecision,
  type MonkeyRunManifest,
} from '../domain/monkeyContracts';
import type {
  DashboardDataSource,
  DashboardEventHandlers,
  UnsubscribeDashboardEvents,
} from './DashboardDataSource';
import { OrderSelectionRepository } from './OrderSelectionRepository';

const DEMO_MARKER = MockOnlyExtensionSchema.parse({
  scope: 'DEMO_ONLY',
  label: DEMO_DATA_LABEL,
  synthetic: true,
});

const DEMO_RUN_ID = 'demo-monkey-20260801T120000Z-00000000';
const DEMO_FORTNITE_RUN_ID = 'demo-current-council-20260801T120000Z-00000000';
const HASH = {
  btc: '1'.repeat(64),
  eth: '2'.repeat(64),
  third: '3'.repeat(64),
  fourth: '4'.repeat(64),
  fifth: '5'.repeat(64),
  sixth: '6'.repeat(64),
  seventh: '7'.repeat(64),
  eighth: '8'.repeat(64),
  artifact: 'a'.repeat(64),
  checkpoint: 'b'.repeat(64),
  result: 'c'.repeat(64),
  manifest: 'd'.repeat(64),
  source: 'e'.repeat(64),
  audit: 'f'.repeat(64),
} as const;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isoAt(base: Date, offsetMs = 0): string {
  return new Date(base.getTime() + offsetMs).toISOString();
}

function abortError(): DOMException {
  return new DOMException('The dashboard request was aborted.', 'AbortError');
}

export class DashboardMockNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} was not found: ${id}`);
    this.name = 'DashboardMockNotFoundError';
  }
}

export interface MockDashboardDataSourceOptions {
  selectionRepository?: OrderSelectionRepository;
  latencyMs?: number;
  eventIntervalMs?: number;
  now?: () => Date;
}

interface DemoFixtureSet {
  manifest: MonkeyRunManifest;
  result: MonkeyJointPublicResult;
  checkpoints: MonkeyCheckpoint[];
  decisions: { BTC: MonkeyPublicationDecision; ETH: MonkeyPublicationDecision };
  orderOrigins: OrderHistoryOrigin[];
  recommendations: CrabRecommendation[];
  notes: CrabNote[];
  fixes: FixCodeProposal[];
  diary: DiaryEntry[];
  activity: ActivityEvent[];
}

/** Demo adapter. It never calls MONKEY, collectors, models, or trading APIs. */
export class MockDashboardDataSource implements DashboardDataSource {
  readonly mode = 'mock' as const;

  private readonly selectionRepository: OrderSelectionRepository;
  private readonly latencyMs: number;
  private readonly eventIntervalMs: number;
  private readonly now: () => Date;
  private readonly fixtures: DemoFixtureSet;
  private readonly subscribers = new Set<DashboardEventHandlers>();
  private eventSequence = 100;

  constructor(options: MockDashboardDataSourceOptions = {}) {
    this.selectionRepository = options.selectionRepository ?? new OrderSelectionRepository();
    this.latencyMs = Math.max(0, options.latencyMs ?? 80);
    this.eventIntervalMs = Math.max(1_000, options.eventIntervalMs ?? 12_000);
    this.now = options.now ?? (() => new Date());
    this.fixtures = createFixtures(this.now());
  }

  async getHealth(signal?: AbortSignal) {
    await this.pause(signal);
    const now = this.now().toISOString();
    return HealthResponseSchema.parse({
      meta: this.meta(),
      status: 'MOCK',
      service: 'fincept-monkey-dashboard-demo',
      version: 'demo-v1',
      checked_at_utc: now,
    });
  }

  async getSystemStatus(signal?: AbortSignal) {
    await this.pause(signal);
    const now = this.now();
    return SystemStatusResponseSchema.parse({
      meta: this.meta(),
      uptime_seconds: 4 * 24 * 60 * 60 + 7_431,
      core_health: 'MOCK',
      data_sync: 'MOCK',
      last_update_utc: isoAt(now, -8_000),
      monkey_state: 'COMPLETE',
      openclaw_state: 'ACTIVE',
      connectivity: 'ONLINE',
      vps_region: 'DEMO-REGION',
      last_heartbeat_utc: isoAt(now, -2_000),
    });
  }

  async getSystemResources(signal?: AbortSignal) {
    await this.pause(signal);
    const now = this.now();
    const samples = Array.from({ length: 24 }, (_, index) => {
      const wave = Math.sin(index / 3);
      return {
        observed_at_utc: isoAt(now, -(23 - index) * 60_000),
        cpu_percent: Number((34 + wave * 11).toFixed(1)),
        memory_percent: Number((57 + Math.cos(index / 4) * 5).toFixed(1)),
        disk_percent: 41.2,
        network_rx_kbps: Number((920 + wave * 220).toFixed(1)),
        network_tx_kbps: Number((310 + Math.cos(index / 2) * 75).toFixed(1)),
      };
    });
    return SystemResourcesResponseSchema.parse({
      meta: this.meta(),
      current: samples.at(-1),
      samples,
      mock_only: DEMO_MARKER,
    });
  }

  async getActivity(query: ActivityQuery = {}, signal?: AbortSignal) {
    await this.pause(signal);
    const parsed = ActivityQuerySchema.parse(query);
    const filtered = this.fixtures.activity
      .filter((item) => parsed.severity === undefined || item.severity === parsed.severity)
      .sort((left, right) => right.occurred_at_utc.localeCompare(left.occurred_at_utc));
    const start = parsed.cursor ? Number.parseInt(parsed.cursor, 10) : 0;
    const safeStart = Number.isFinite(start) && start >= 0 ? start : 0;
    const items = filtered.slice(safeStart, safeStart + parsed.limit);
    const next = safeStart + items.length;
    return ActivityResponseSchema.parse({
      meta: this.meta(),
      items: clone(items),
      next_cursor: next < filtered.length ? String(next) : null,
    });
  }

  async getMonkeyCurrent(signal?: AbortSignal) {
    await this.pause(signal);
    return MonkeyCurrentResponseSchema.parse({
      meta: this.meta(),
      run_manifest: clone(this.fixtures.manifest),
      result: clone(this.fixtures.result),
      current_stage: 'FINALIZE',
      progress_percent: 100,
      btc_publication: 'FORTNITE_ONLY',
      eth_publication: 'FORTNITE_ONLY',
      last_run_utc: this.fixtures.manifest.updated_utc,
    });
  }

  async getMonkeyRuns(signal?: AbortSignal) {
    await this.pause(signal);
    const manifest = this.fixtures.manifest;
    return MonkeyRunsResponseSchema.parse({
      meta: this.meta(),
      runs: [
        {
          run_id: manifest.run_id,
          mode: manifest.mode,
          status: manifest.status,
          publication: manifest.publication,
          created_utc: manifest.created_utc,
          updated_utc: manifest.updated_utc,
          current_stage: 'FINALIZE',
          progress_percent: 100,
          final_result: manifest.final_result,
        },
      ],
    });
  }

  async getMonkeyRun(run_id: string, signal?: AbortSignal) {
    await this.pause(signal);
    if (run_id !== this.fixtures.manifest.run_id) {
      throw new DashboardMockNotFoundError('MONKEY run', run_id);
    }
    return MonkeyRunDetailResponseSchema.parse({
      meta: this.meta(),
      run_manifest: clone(this.fixtures.manifest),
      result: clone(this.fixtures.result),
      checkpoints: clone(this.fixtures.checkpoints),
      publication_decisions: clone(this.fixtures.decisions),
    });
  }

  async getStructureCurrent(signal?: AbortSignal) {
    await this.pause(signal);
    const now = this.now();
    return StructureCurrentResponseSchema.parse({
      meta: this.meta(),
      assets: {
        BTC: {
          origin_id: HASH.btc,
          asset: 'BTC',
          origin_spot: 64_666.09,
          current_price: 64_812.4,
          p80: [63_827.36, 65_504.83],
          p90: [63_333.22, 65_816.11],
          gamma_walls: [
            demoWall('btc.wall.1', 1, 65_000, isoAt(now, 7 * 60 * 60_000), 0.21),
            demoWall('btc.wall.2', 2, 64_000, isoAt(now, 7 * 60 * 60_000), 0.16),
          ],
          expiry_utc: isoAt(now, 7 * 60 * 60_000),
          as_of_utc: isoAt(now, -24_000),
          age_seconds: 24,
          data_reliability: 'DEGRADED',
          market_structure: 'PINNING',
          capabilities: {
            unsigned_walls_usable: true,
            unsigned_gamma_usable: true,
            signed_regime_usable: false,
            expiry_context_usable: true,
          },
          mock_only: DEMO_MARKER,
        },
        ETH: {
          origin_id: HASH.eth,
          asset: 'ETH',
          origin_spot: 1_917.68,
          current_price: 1_926.2,
          p80: [1_857.04, 1_978.32],
          p90: [1_827.64, 2_007.72],
          gamma_walls: [
            demoWall('eth.wall.1', 1, 1_950, isoAt(now, 19 * 60 * 60_000), 0.19),
            demoWall('eth.wall.2', 2, 1_900, isoAt(now, 19 * 60 * 60_000), 0.14),
          ],
          expiry_utc: isoAt(now, 19 * 60 * 60_000),
          as_of_utc: isoAt(now, -31_000),
          age_seconds: 31,
          data_reliability: 'DEGRADED',
          market_structure: 'ASYMMETRIC_TAIL',
          capabilities: {
            unsigned_walls_usable: true,
            unsigned_gamma_usable: true,
            signed_regime_usable: false,
            expiry_context_usable: true,
          },
          mock_only: DEMO_MARKER,
        },
      },
    });
  }

  async getOrderHistory(query: OrderHistoryQuery = {}, signal?: AbortSignal) {
    await this.pause(signal);
    const parsed = OrderHistoryQuerySchema.parse(query);
    const origins = this.orderOriginsWithSelections().filter(
      (origin) =>
        (parsed.asset === undefined || origin.asset === parsed.asset) &&
        (parsed.horizon_hours === undefined || origin.horizon_hours === parsed.horizon_hours) &&
        (parsed.since_utc === undefined || origin.created_utc >= parsed.since_utc),
    );
    return OrderHistoryResponseSchema.parse({
      meta: this.meta(),
      origins,
    });
  }

  async getOrderHistoryOrigin(origin_id: string, signal?: AbortSignal) {
    await this.pause(signal);
    const origin = this.findOrderOrigin(origin_id);
    const context =
      origin.asset === 'BTC'
        ? this.fixtures.result.fortnite.contexts.BTC
        : this.fixtures.result.fortnite.contexts.ETH;
    const currentAssetResult = this.fixtures.result.assets[origin.asset];
    return OrderHistoryDetailResponseSchema.parse({
      meta: this.meta(),
      origin,
      fortnite_context: context,
      monkey_public_result:
        'schema_version' in currentAssetResult && currentAssetResult.origin_id === origin.origin_id
          ? currentAssetResult
          : null,
    });
  }

  async selectOrderHistoryOrigin(
    origin_id: string,
    request: SelectOrderOriginRequest,
    signal?: AbortSignal,
  ) {
    await this.pause(signal);
    const parsedRequest = SelectOrderOriginRequestSchema.parse(request);
    const origin = this.findOrderOrigin(origin_id);
    const selection = this.selectionRepository.select({
      origin_id: origin.origin_id,
      asset: origin.asset,
      horizon_hours: origin.horizon_hours,
      selection_deadline_utc: origin.selection_deadline_utc,
      expected_selected_origin_id: parsedRequest.expected_selected_origin_id,
    });
    const selected = this.findOrderOrigin(origin_id);
    const event = this.createLiveEvent(
      'FORECAST_SELECTED',
      'success',
      'Forecast selected locally',
      `${origin.asset} ${origin.horizon_hours}h origin ${origin.origin_id.slice(0, 8)} selected in browser storage.`,
      origin.origin_id,
    );
    this.fixtures.activity.push(event);
    this.emit(event);
    return SelectOrderOriginResponseSchema.parse({
      meta: this.meta(),
      selection,
      origin: selected,
    });
  }

  async getCrabRecommendations(signal?: AbortSignal) {
    await this.pause(signal);
    return CrabRecommendationsResponseSchema.parse({
      meta: this.meta(),
      items: clone(this.fixtures.recommendations),
    });
  }

  async decideCrabRecommendation(
    id: string,
    request: ManualDecisionRequest,
    signal?: AbortSignal,
  ) {
    await this.pause(signal);
    const item = this.decideItem(this.fixtures.recommendations, id, request, 'recommendation');
    return CrabRecommendationDecisionResponseSchema.parse({ meta: this.meta(), item });
  }

  async getCrabNotes(signal?: AbortSignal) {
    await this.pause(signal);
    return CrabNotesResponseSchema.parse({
      meta: this.meta(),
      items: clone(this.fixtures.notes),
    });
  }

  async decideCrabNote(id: string, request: ManualDecisionRequest, signal?: AbortSignal) {
    await this.pause(signal);
    const item = this.decideItem(this.fixtures.notes, id, request, 'CRAB note');
    return CrabNoteDecisionResponseSchema.parse({ meta: this.meta(), item });
  }

  async getFixCode(signal?: AbortSignal) {
    await this.pause(signal);
    return FixCodeResponseSchema.parse({
      meta: this.meta(),
      items: clone(this.fixtures.fixes),
    });
  }

  async decideFixCode(id: string, request: ManualDecisionRequest, signal?: AbortSignal) {
    await this.pause(signal);
    const item = this.decideItem(this.fixtures.fixes, id, request, 'fix proposal');
    // Approval records a local decision only. `auto_apply` remains false forever.
    item.auto_apply = false;
    return FixCodeDecisionResponseSchema.parse({ meta: this.meta(), item });
  }

  async getDiary(query: DiaryQuery = {}, signal?: AbortSignal) {
    await this.pause(signal);
    const parsed = DiaryQuerySchema.parse(query);
    const needle = parsed.query?.trim().toLocaleLowerCase();
    const entries = this.fixtures.diary.filter((entry) => {
      const matchesText =
        needle === undefined ||
        [entry.title, entry.body, entry.day_conclusion, ...entry.observations]
          .join(' ')
          .toLocaleLowerCase()
          .includes(needle);
      const matchesStart = parsed.date_from === undefined || entry.created_utc >= parsed.date_from;
      const matchesEnd = parsed.date_to === undefined || entry.created_utc <= parsed.date_to;
      return matchesText && matchesStart && matchesEnd;
    });
    return DiaryResponseSchema.parse({
      meta: this.meta(),
      entries: entries.map((entry) => ({
        id: entry.id,
        created_utc: entry.created_utc,
        title: entry.title,
        mood: entry.mood,
        mode: entry.mode,
        day_conclusion: entry.day_conclusion,
        related_run_ids: entry.related_run_ids,
        mock_only: entry.mock_only,
      })),
    });
  }

  async getDiaryEntry(id: string, signal?: AbortSignal) {
    await this.pause(signal);
    const entry = this.fixtures.diary.find((candidate) => candidate.id === id);
    if (!entry) throw new DashboardMockNotFoundError('diary entry', id);
    return DiaryDetailResponseSchema.parse({ meta: this.meta(), entry: clone(entry) });
  }

  subscribeToEvents(
    handlers: DashboardEventHandlers,
    signal?: AbortSignal,
  ): UnsubscribeDashboardEvents {
    if (signal?.aborted) return () => undefined;
    this.subscribers.add(handlers);
    queueMicrotask(() => handlers.onOpen?.());
    const timer = setInterval(() => {
      if (signal?.aborted) return;
      handlers.onEvent(
        this.createLiveEvent(
          'STAGE_COMPLETED',
          'info',
          'Demo heartbeat',
          'Mock event timer is active; no production process was invoked.',
          null,
        ),
      );
    }, this.eventIntervalMs);
    const unsubscribe = () => {
      clearInterval(timer);
      this.subscribers.delete(handlers);
      signal?.removeEventListener('abort', unsubscribe);
    };
    signal?.addEventListener('abort', unsubscribe, { once: true });
    return unsubscribe;
  }

  private meta() {
    return {
      data_mode: 'mock' as const,
      demo_data: true as const,
      demo_label: DEMO_DATA_LABEL,
      observed_at_utc: this.now().toISOString(),
      stale: false,
    };
  }

  private async pause(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw abortError();
    if (this.latencyMs === 0) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, this.latencyMs);
      const onAbort = () => {
        clearTimeout(timer);
        reject(abortError());
      };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private orderOriginsWithSelections(): OrderHistoryOrigin[] {
    const selections = new Map(
      this.selectionRepository
        .listSelections()
        .map((selection) => [`${selection.asset}:${selection.horizon_hours}`, selection]),
    );
    return this.fixtures.orderOrigins.map((origin) => {
      const selection = selections.get(`${origin.asset}:${origin.horizon_hours}`);
      return OrderHistoryOriginSchema.parse({
        ...origin,
        selected_by_user: selection?.origin_id === origin.origin_id,
        selected_utc: selection?.origin_id === origin.origin_id ? selection.selected_utc : null,
      });
    });
  }

  private findOrderOrigin(origin_id: string): OrderHistoryOrigin {
    const origin = this.orderOriginsWithSelections().find((candidate) => candidate.origin_id === origin_id);
    if (!origin) throw new DashboardMockNotFoundError('forecast origin', origin_id);
    return origin;
  }

  private decideItem<T extends CrabRecommendation | CrabNote | FixCodeProposal>(
    items: T[],
    id: string,
    request: ManualDecisionRequest,
    entity: string,
  ): T {
    const parsed = ManualDecisionRequestSchema.parse(request);
    const index = items.findIndex((candidate) => candidate.id === id);
    if (index < 0) throw new DashboardMockNotFoundError(entity, id);
    const current = items[index];
    if (!current) throw new DashboardMockNotFoundError(entity, id);
    const next = {
      ...current,
      status: parsed.decision === 'APPROVE' ? ('APPROVED' as const) : ('REJECTED' as const),
      decision: {
        decision: parsed.decision,
        decided_utc: this.now().toISOString(),
        operator_note: parsed.operator_note ?? null,
        decision_scope: 'LOCAL_DEMO_ONLY' as const,
      },
    };
    items[index] = next;
    const event = this.createLiveEvent(
      'RECOMMENDATION_CREATED',
      'info',
      'Local demo decision recorded',
      `${entity} ${id} was ${parsed.decision.toLocaleLowerCase()}d locally.`,
      id,
    );
    this.fixtures.activity.push(event);
    this.emit(event);
    return clone(next);
  }

  private createLiveEvent(
    kind: ActivityEvent['kind'],
    severity: ActivityEvent['severity'],
    title: string,
    message: string,
    related_id: string | null,
  ): ActivityEvent {
    this.eventSequence += 1;
    return ActivityEventSchema.parse({
      id: `demo-live-${this.eventSequence}`,
      run_id: DEMO_RUN_ID,
      sequence: null,
      kind,
      occurred_at_utc: this.now().toISOString(),
      severity,
      title,
      message,
      stage: null,
      status: 'MOCK',
      related_id,
      mock_only: DEMO_MARKER,
    });
  }

  private emit(event: ActivityEvent): void {
    for (const subscriber of this.subscribers) subscriber.onEvent(clone(event));
  }
}

function demoWall(
  field_id: string,
  rank: number,
  strike: number,
  expiry_utc: string,
  share: number,
) {
  return {
    field_id,
    basis: 'NORMALIZED_UNSIGNED_GAMMA_USD_1PCT' as const,
    rank,
    strike,
    expiry_utc,
    option_types_present: ['CALL', 'PUT'] as const,
    mass: strike * 8.4,
    mass_unit: 'USD_DELTA_PER_1PCT_MOVE' as const,
    share_of_basis_total: share,
    distance_to_fortnite_origin_spot: strike - 64_666,
    distance_to_p80_lower: strike - 63_827,
    distance_to_p80_upper: strike - 65_505,
    distance_to_p90_lower: strike - 63_333,
    distance_to_p90_upper: strike - 65_816,
  };
}

function createFixtures(now: Date): DemoFixtureSet {
  const created = isoAt(now, -70 * 60_000);
  const updated = isoAt(now, -5 * 60_000);
  const finalized = isoAt(now, -58 * 60_000);
  const origin = isoAt(now, -60 * 60_000);
  const checkpointBase = {
    schema_version: 'MONKEY_ONE_BUTTON_CHECKPOINT_V1' as const,
    artifacts: {},
    checkpoint_sha256: HASH.checkpoint,
  };
  const checkpoints = [
    { sequence: 1, stage: 'PREFLIGHT', status: 'COMPLETE', details: { mode: 'DRY_RUN', preflight_status: 'PASS' } },
    { sequence: 2, stage: 'FORTNITE', status: 'COMPLETE', details: { deliveries: 21, attempts: 21 } },
    { sequence: 3, stage: 'GAMMA', status: 'COMPLETE', details: { deribit_calls: 0, demo: true } },
    { sequence: 4, stage: 'DOTA', status: 'COMPLETE', details: { effective: false, logical_deliveries: 12 } },
    { sequence: 5, stage: 'MONKEY_ASSEMBLY', status: 'COMPLETE', details: { candidate_decision_hash: HASH.source } },
    { sequence: 6, stage: 'WALL_STREET', status: 'COMPLETE', details: { review_status: 'OVERLAY_WITHHELD' } },
    { sequence: 7, stage: 'RELEASE', status: 'COMPLETE', details: { publication_modes: { BTC: 'FORTNITE_ONLY', ETH: 'FORTNITE_ONLY' } } },
    { sequence: 8, stage: 'EVALUATION', status: 'COMPLETE', details: { target_count: 0 } },
    { sequence: 9, stage: 'FINALIZE', status: 'COMPLETE', details: { publication: 'FORTNITE_ONLY', background_workers_remaining: 0 } },
  ].map((item, index) =>
    MonkeyCheckpointSchema.parse({
      ...checkpointBase,
      ...item,
      completed_utc: isoAt(now, -(65 - index * 7) * 60_000),
    }),
  );

  const stageTimes = Object.fromEntries(
    ['PREFLIGHT', 'FORTNITE', 'GAMMA', 'DOTA', 'MONKEY_ASSEMBLY', 'WALL_STREET', 'RELEASE', 'EVALUATION', 'FINALIZE'].map(
      (stage, index) => [
        stage,
        {
          status: 'COMPLETE',
          started_utc: isoAt(now, -(69 - index * 7) * 60_000),
          finished_utc: checkpoints[index]?.completed_utc,
          checkpoint: `/demo/checkpoints/${String(index + 1).padStart(3, '0')}-${stage.toLocaleLowerCase()}.json`,
          artifacts: {},
          reason_codes: [],
        },
      ],
    ),
  );

  const manifest = MonkeyRunManifestSchema.parse({
    schema_version: 'MONKEY_ONE_BUTTON_RUN_MANIFEST_V1',
    pipeline_version: 'MONKEY_ONE_BUTTON_LIVE_PIPELINE_V1',
    run_id: DEMO_RUN_ID,
    mode: 'DRY_RUN',
    status: 'COMPLETE_FORTNITE_ONLY',
    created_utc: created,
    updated_utc: updated,
    run_dir: '/demo/monkey-runs/current',
    stages: stageTimes,
    counters: {
      fortnite_deliveries: 21,
      dota_deliveries: 12,
      wall_street_deliveries: 3,
      model_http_attempts: 0,
      dota_http_attempts: 0,
      wall_street_http_attempts: 0,
      deribit_calls: 0,
      background_workers_remaining: 0,
      trading_actions: 0,
    },
    publication: 'FORTNITE_ONLY',
    fortnite_byte_identity: 'PASS',
    secret_leak_detected: false,
    sealed_holdout_read: false,
    commit_created: false,
    final_result: { path: 'public/MONKEY-RESULT.json', sha256: HASH.result, byte_length: 2_709 },
    audit_result: { path: 'monkey/MONKEY-AUDIT-BUNDLE.json', sha256: HASH.audit, byte_length: 120_853 },
    last_error: null,
    manifest_sha256: HASH.manifest,
  });

  const btcContext = {
    schema_version: 'FORTNITE_FINAL_FORECAST_CONTEXT_V1',
    final_status: 'FINAL',
    asset: 'BTCUSDT',
    origin_time_utc: origin,
    finalized_at_utc: finalized,
    forecast_window: { start_utc: finalized, end_utc: isoAt(new Date(origin), 12 * 60 * 60_000) },
    p80: [63_827.36, 65_504.83],
    p90: [63_333.22, 65_816.11],
  };
  const ethContext = {
    schema_version: 'FORTNITE_FINAL_FORECAST_CONTEXT_V1',
    final_status: 'FINAL',
    asset: 'ETHUSDT',
    origin_time_utc: origin,
    finalized_at_utc: finalized,
    forecast_window: { start_utc: finalized, end_utc: isoAt(new Date(origin), 24 * 60 * 60_000) },
    p80: [1_857.04, 1_978.32],
    p90: [1_827.64, 2_007.72],
  };
  const perAsset = (asset: 'BTC' | 'ETH', origin_id: string, publicHash: string) => ({
    schema_version: 'MONKEY_PUBLIC_RESULT_V1',
    origin_id,
    asset,
    fortnite: { sha256: HASH.artifact, byte_length: 19_304, artifact_ref: 'fortnite/canonical_payload.json' },
    wall_street_status: 'OVERLAY_WITHHELD',
    system_state: 'WALL_STREET_ACTIVE',
    effective_publication: 'FORTNITE_ONLY',
    status_message: 'DOTA overlay withheld; immutable FORTNITE only.',
    publication_decision_sha256: HASH.source,
    public_result_sha256: publicHash,
  });
  const result = MonkeyJointPublicResultSchema.parse({
    schema_version: 'MONKEY_JOINT_PUBLIC_RESULT_V1',
    pipeline_version: 'MONKEY_ONE_BUTTON_LIVE_PIPELINE_V1',
    run_id: DEMO_RUN_ID,
    fortnite_run_id: DEMO_FORTNITE_RUN_ID,
    advisory_only: true,
    trading_actions: 0,
    effective_publication: 'FORTNITE_ONLY',
    fortnite: {
      authoritative_artifact_ref: 'fortnite/canonical_payload.json',
      sha256: HASH.artifact,
      byte_length: 19_304,
      byte_identity: 'PASS',
      contexts: { BTC: btcContext, ETH: ethContext },
    },
    assets: {
      BTC: perAsset('BTC', HASH.btc, HASH.btc),
      ETH: perAsset('ETH', HASH.eth, HASH.eth),
    },
    failure: null,
    result_sha256: HASH.result,
  });

  const decision = (asset: 'BTC' | 'ETH', origin_id: string) =>
    MonkeyPublicationDecisionSchema.parse({
      schema_version: 'MONKEY_PUBLICATION_DECISION_V1',
      origin_id,
      asset,
      wall_street_status: 'OVERLAY_WITHHELD',
      system_state: 'WALL_STREET_ACTIVE',
      effective_publication: 'FORTNITE_ONLY',
      reason_codes: ['DOTA_OVERLAY_WITHHELD'],
      source_hashes: {
        review_input_sha256: HASH.source,
        wall_street_result_sha256: HASH.source,
        wall_street_audit_sha256: HASH.audit,
        monkey_result_sha256: HASH.result,
        dota_overlay_sha256: HASH.source,
        fortnite_sha256: HASH.artifact,
        origin_event_sha256: HASH.source,
        system_state_sha256: HASH.source,
        audit_bundle_sha256: HASH.audit,
      },
      created_utc: updated,
    });

  return {
    manifest,
    result,
    checkpoints,
    decisions: { BTC: decision('BTC', HASH.btc), ETH: decision('ETH', HASH.eth) },
    orderOrigins: createOrderOrigins(now),
    recommendations: createRecommendations(now),
    notes: createNotes(now),
    fixes: createFixes(now),
    diary: createDiary(now),
    activity: createActivity(now),
  };
}

function createOrderOrigins(now: Date): OrderHistoryOrigin[] {
  const definitions = [
    [HASH.btc, 'BTC', 12, 64_666, [63_827, 65_505], [63_333, 65_816], -1],
    [HASH.third, 'BTC', 12, 64_210, [63_400, 65_020], [62_950, 65_480], -3],
    [HASH.fourth, 'BTC', 24, 64_120, [62_900, 65_340], [62_280, 66_020], -5],
    [HASH.eth, 'ETH', 24, 1_918, [1_857, 1_978], [1_828, 2_008], -1],
    [HASH.fifth, 'ETH', 24, 1_902, [1_840, 1_964], [1_810, 1_995], -4],
    [HASH.sixth, 'ETH', 12, 1_909, [1_872, 1_946], [1_850, 1_969], -6],
  ] as const;
  return definitions.map(([origin_id, asset, horizon, center, p80, p90, hoursAgo]) =>
    OrderHistoryOriginSchema.parse({
      origin_id,
      created_utc: isoAt(now, hoursAgo * 60 * 60_000),
      asset,
      horizon_hours: horizon,
      center,
      p80,
      p90,
      fortnite_status: 'FINAL',
      dota_status: 'GAMMA_UNRELIABLE',
      wall_street_status: 'OVERLAY_WITHHELD',
      effective_publication: 'FORTNITE_ONLY',
      selected_by_user: false,
      selected_utc: null,
      selection_deadline_utc: isoAt(now, (30 + Math.abs(hoursAgo) * 3) * 60_000),
      outcome_status: 'PENDING',
      actual_outcome: null,
      notes: 'Synthetic forecast origin for UI interaction only.',
      mock_only: DEMO_MARKER,
    }),
  );
}

function createRecommendations(now: Date): CrabRecommendation[] {
  return [
    CrabRecommendationSchema.parse({
      id: 'demo-rec-001',
      created_utc: isoAt(now, -45 * 60_000),
      title: 'Expose a safe structure projection',
      priority: 'HIGH',
      rationale: 'The public MONKEY result does not expose current price or gamma walls.',
      risk: 'Backend projection must not serialize raw model content.',
      status: 'NEW',
      manual_review_required: true,
      auto_apply: false,
      decision: null,
      mock_only: DEMO_MARKER,
    }),
  ];
}

function createNotes(now: Date): CrabNote[] {
  return [
    CrabNoteSchema.parse({
      id: 'demo-note-001',
      created_utc: isoAt(now, -35 * 60_000),
      immutable_timestamp: true,
      title: 'Fail-closed publication is intentional',
      body: 'FORTNITE_ONLY is a valid completed result, not a failed trading signal.',
      weaknesses: ['Current safe output omits a public center field.'],
      risky_changes: ['Treating the legacy overlay schema as runtime authority.'],
      proposals: ['Use discriminated contracts and a backend-owned safe projection.'],
      status: 'NEW',
      manual_review_required: true,
      auto_apply: false,
      decision: null,
      mock_only: DEMO_MARKER,
    }),
  ];
}

function createFixes(now: Date): FixCodeProposal[] {
  return [
    FixCodeProposalSchema.parse({
      id: 'demo-fix-001',
      created_utc: isoAt(now, -25 * 60_000),
      title: 'Example adapter guard',
      error_summary: 'Unknown status values need a visible fallback.',
      proposed_fix: 'Normalize unrecognized status strings to UNKNOWN in the UI adapter.',
      affected_files: ['src/domain/statusRegistry.ts'],
      risk_level: 'LOW',
      test_status: 'NOT_RUN',
      diff_preview: '// Demo preview only — no patch is applied.',
      status: 'NEW',
      manual_review_required: true,
      auto_apply: false,
      decision: null,
      mock_only: DEMO_MARKER,
    }),
  ];
}

function createDiary(now: Date): DiaryEntry[] {
  return [
    DiaryEntrySchema.parse({
      id: 'demo-diary-001',
      created_utc: isoAt(now, -15 * 60_000),
      title: 'I kept the boundary intact',
      mood: 'Focused',
      mode: 'Observer',
      day_conclusion: 'A withheld overlay is still a useful audited outcome.',
      related_run_ids: [DEMO_RUN_ID],
      observations: ['The final manifest is complete and FORTNITE_ONLY.'],
      doubts: ['A future backend must decide which structure fields are safe to project.'],
      goals: ['Keep all recommendations manual and reversible.'],
      body: 'Today I watched the pipeline close itself safely. Nothing was traded or patched.',
      mock_only: DEMO_MARKER,
    }),
  ];
}

function createActivity(now: Date): ActivityEvent[] {
  const values = [
    ['demo-activity-1', 1, 'STAGE_STARTED', 'info', 'MONKEY run started', 'PREFLIGHT', 'RUNNING'],
    ['demo-activity-2', 4, 'STAGE_COMPLETED', 'success', 'DOTA completed fail-closed', 'DOTA', 'COMPLETE'],
    ['demo-activity-3', 6, 'STAGE_COMPLETED', 'warning', 'Overlay withheld', 'WALL_STREET', 'WITHHELD'],
    ['demo-activity-4', 9, 'MONKEY_RESULT', 'success', 'Public result finalized', 'FINALIZE', 'FORTNITE_ONLY'],
  ] as const;
  return values.map(([id, sequence, kind, severity, title, stage, status], index) =>
    ActivityEventSchema.parse({
      id,
      run_id: DEMO_RUN_ID,
      sequence,
      kind,
      occurred_at_utc: isoAt(now, -(50 - index * 12) * 60_000),
      severity,
      title,
      message: `${title}. This is synthetic demo activity.`,
      stage,
      status,
      related_id: null,
      mock_only: DEMO_MARKER,
    }),
  );
}
