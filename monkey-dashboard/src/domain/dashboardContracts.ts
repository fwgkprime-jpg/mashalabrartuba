import { z } from 'zod';

import { normalizeStatus, type StatusCode } from './statusRegistry';
import {
  FortniteForecastContextSchema,
  JointPublicationModeSchema,
  ManifestPublicationModeSchema,
  MonkeyAssetSchema,
  MonkeyCanonicalStageSchema,
  MonkeyCheckpointSchema,
  MonkeyJointPublicResultSchema,
  MonkeyPerAssetPublicResultSchema,
  MonkeyPublicationDecisionSchema,
  MonkeyRunManifestSchema,
  MonkeyRunModeSchema,
  MonkeyRunStatusSchema,
  PerAssetPublicationModeSchema,
  PriceBoundsSchema,
  Sha256Schema,
  UtcTimestampSchema,
  WallStreetStatusSchema,
  WallStreetSystemStateSchema,
} from './monkeyContracts';

/** Future `/api/v1` projection contracts consumed by the dashboard. */

export const DEMO_DATA_LABEL = 'DEMO / MOCK DATA' as const;

export const DashboardStatusSchema = z
  .string()
  .transform((value): StatusCode => normalizeStatus(value));

export const MockOnlyExtensionSchema = z.strictObject({
  scope: z.literal('DEMO_ONLY'),
  label: z.literal(DEMO_DATA_LABEL),
  synthetic: z.literal(true),
});

const HttpDataMetaSchema = z.strictObject({
  data_mode: z.literal('http'),
  demo_data: z.literal(false),
  observed_at_utc: UtcTimestampSchema,
  stale: z.boolean(),
});

const MockDataMetaSchema = z.strictObject({
  data_mode: z.literal('mock'),
  demo_data: z.literal(true),
  demo_label: z.literal(DEMO_DATA_LABEL),
  observed_at_utc: UtcTimestampSchema,
  stale: z.boolean(),
});

export const DashboardDataMetaSchema = z.discriminatedUnion('data_mode', [
  HttpDataMetaSchema,
  MockDataMetaSchema,
]);

export const HealthResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  status: DashboardStatusSchema,
  service: z.string().min(1),
  version: z.string().min(1),
  checked_at_utc: UtcTimestampSchema,
});

export const SystemStatusResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  uptime_seconds: z.number().int().nonnegative(),
  core_health: DashboardStatusSchema,
  data_sync: DashboardStatusSchema,
  last_update_utc: UtcTimestampSchema,
  monkey_state: DashboardStatusSchema,
  openclaw_state: DashboardStatusSchema,
  connectivity: DashboardStatusSchema,
  vps_region: z.string().min(1),
  last_heartbeat_utc: UtcTimestampSchema,
});

export const ResourceSampleSchema = z.strictObject({
  observed_at_utc: UtcTimestampSchema,
  cpu_percent: z.number().min(0).max(100),
  memory_percent: z.number().min(0).max(100),
  disk_percent: z.number().min(0).max(100),
  network_rx_kbps: z.number().nonnegative(),
  network_tx_kbps: z.number().nonnegative(),
});

export const SystemResourcesResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  current: ResourceSampleSchema,
  samples: z.array(ResourceSampleSchema).max(240),
  mock_only: MockOnlyExtensionSchema.optional(),
});

export const ActivityKindSchema = z.enum([
  'STAGE_STARTED',
  'STAGE_COMPLETED',
  'MONKEY_RESULT',
  'RECOMMENDATION_CREATED',
  'DIARY_ENTRY',
  'FORECAST_SELECTED',
  'ERROR',
  'RECOVERY',
]);

export const ActivitySeveritySchema = z.enum(['info', 'success', 'warning', 'error']);

export const ActivityEventSchema = z.strictObject({
  id: z.string().min(1),
  run_id: z.string().min(1).nullable(),
  sequence: z.number().int().positive().nullable(),
  kind: ActivityKindSchema,
  occurred_at_utc: UtcTimestampSchema,
  severity: ActivitySeveritySchema,
  title: z.string().min(1),
  message: z.string().min(1),
  stage: z.string().min(1).nullable(),
  status: DashboardStatusSchema,
  related_id: z.string().min(1).nullable(),
  mock_only: MockOnlyExtensionSchema.optional(),
});

export const ActivityResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  items: z.array(ActivityEventSchema),
  next_cursor: z.string().min(1).nullable(),
});

export const ActivityQuerySchema = z.strictObject({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  severity: ActivitySeveritySchema.optional(),
});

export const MonkeyCurrentResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  run_manifest: MonkeyRunManifestSchema,
  result: MonkeyJointPublicResultSchema,
  current_stage: MonkeyCanonicalStageSchema,
  progress_percent: z.number().min(0).max(100),
  btc_publication: PerAssetPublicationModeSchema,
  eth_publication: PerAssetPublicationModeSchema,
  last_run_utc: UtcTimestampSchema,
});

export const MonkeyRunSummarySchema = z.strictObject({
  run_id: z.string().min(1),
  mode: MonkeyRunModeSchema,
  status: MonkeyRunStatusSchema,
  publication: ManifestPublicationModeSchema,
  created_utc: UtcTimestampSchema,
  updated_utc: UtcTimestampSchema,
  current_stage: MonkeyCanonicalStageSchema,
  progress_percent: z.number().min(0).max(100),
  final_result: z
    .strictObject({
      path: z.string().min(1),
      sha256: Sha256Schema,
      byte_length: z.number().int().positive(),
    })
    .nullable(),
});

export const MonkeyRunsResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  runs: z.array(MonkeyRunSummarySchema),
});

export const MonkeyRunDetailResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  run_manifest: MonkeyRunManifestSchema,
  result: MonkeyJointPublicResultSchema.nullable(),
  checkpoints: z.array(MonkeyCheckpointSchema),
  publication_decisions: z
    .strictObject({
      BTC: MonkeyPublicationDecisionSchema,
      ETH: MonkeyPublicationDecisionSchema,
    })
    .nullable(),
});

export const EvidenceReliabilitySchema = z.enum([
  'RELIABLE',
  'DEGRADED',
  'STALE',
  'UNVALIDATED_SIGN',
  'UNUSABLE',
]);

export const GammaWallSchema = z.strictObject({
  field_id: z.string().min(1),
  basis: z.enum(['OI', 'RAW_GCI', 'NORMALIZED_UNSIGNED_GAMMA_USD_1PCT']),
  rank: z.number().int().min(1).max(20),
  strike: z.number().positive(),
  expiry_utc: UtcTimestampSchema,
  option_types_present: z.array(z.enum(['CALL', 'PUT'])).min(1).max(2),
  mass: z.number().nonnegative(),
  mass_unit: z.enum([
    'BASE_COIN',
    'BASE_COIN_SQUARED_PER_USD',
    'USD_DELTA_PER_1PCT_MOVE',
  ]),
  share_of_basis_total: z.number().min(0).max(1),
  distance_to_fortnite_origin_spot: z.number(),
  distance_to_p80_lower: z.number(),
  distance_to_p80_upper: z.number(),
  distance_to_p90_lower: z.number(),
  distance_to_p90_upper: z.number(),
});

export const StructureAssetSchema = z.strictObject({
  origin_id: Sha256Schema.nullable(),
  asset: MonkeyAssetSchema,
  origin_spot: z.number().positive().nullable(),
  current_price: z.number().positive().nullable(),
  p80: PriceBoundsSchema.nullable(),
  p90: PriceBoundsSchema.nullable(),
  gamma_walls: z.array(GammaWallSchema),
  expiry_utc: UtcTimestampSchema.nullable(),
  as_of_utc: UtcTimestampSchema,
  age_seconds: z.number().int().nonnegative(),
  data_reliability: EvidenceReliabilitySchema,
  market_structure: z.enum([
    'PINNING',
    'DAMPENING',
    'BREAKOUT_AMPLIFICATION',
    'ASYMMETRIC_TAIL',
    'NEUTRAL',
    'UNKNOWN',
  ]),
  capabilities: z.strictObject({
    unsigned_walls_usable: z.boolean(),
    unsigned_gamma_usable: z.boolean(),
    signed_regime_usable: z.boolean(),
    expiry_context_usable: z.boolean(),
  }),
  mock_only: MockOnlyExtensionSchema.optional(),
});

export const StructureCurrentResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  assets: z.strictObject({
    BTC: StructureAssetSchema,
    ETH: StructureAssetSchema,
  }),
});

export const ForecastHorizonSchema = z.union([z.literal(12), z.literal(24)]);
export const ForecastOutcomeStatusSchema = z.enum(['INSIDE', 'OUTSIDE', 'PENDING']);

export const OrderHistoryOriginSchema = z.strictObject({
  origin_id: Sha256Schema,
  created_utc: UtcTimestampSchema,
  asset: MonkeyAssetSchema,
  horizon_hours: ForecastHorizonSchema,
  center: z.number().positive().nullable(),
  p80: PriceBoundsSchema,
  p90: PriceBoundsSchema,
  fortnite_status: z.string().min(1),
  dota_status: z.string().min(1),
  wall_street_status: WallStreetStatusSchema,
  effective_publication: PerAssetPublicationModeSchema,
  selected_by_user: z.boolean(),
  selected_utc: UtcTimestampSchema.nullable(),
  selection_deadline_utc: UtcTimestampSchema,
  outcome_status: ForecastOutcomeStatusSchema,
  actual_outcome: z.number().positive().nullable(),
  notes: z.string().nullable(),
  mock_only: MockOnlyExtensionSchema.optional(),
});

export const OrderHistoryQuerySchema = z.strictObject({
  asset: MonkeyAssetSchema.optional(),
  since_utc: UtcTimestampSchema.optional(),
  horizon_hours: ForecastHorizonSchema.optional(),
});

export const OrderHistoryResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  origins: z.array(OrderHistoryOriginSchema),
});

export const OrderHistoryDetailResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  origin: OrderHistoryOriginSchema,
  fortnite_context: FortniteForecastContextSchema.nullable(),
  monkey_public_result: MonkeyPerAssetPublicResultSchema.nullable(),
});

export const SelectOrderOriginRequestSchema = z.strictObject({
  expected_selected_origin_id: Sha256Schema.nullable().optional(),
});

export const OrderSelectionSchema = z.strictObject({
  origin_id: Sha256Schema,
  asset: MonkeyAssetSchema,
  horizon_hours: ForecastHorizonSchema,
  selected_utc: UtcTimestampSchema,
  replaced_origin_id: Sha256Schema.nullable(),
  storage_scope: z.enum(['LOCAL_BROWSER', 'BACKEND']),
});

export const SelectOrderOriginResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  selection: OrderSelectionSchema,
  origin: OrderHistoryOriginSchema,
});

export const ManualReviewStatusSchema = z.enum(['NEW', 'REVIEWED', 'APPROVED', 'REJECTED']);
export const ManualPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const ManualRiskSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const ManualDecisionRequestSchema = z.strictObject({
  decision: z.enum(['APPROVE', 'REJECT']),
  operator_note: z.string().max(2_000).optional(),
});

export const ManualDecisionRecordSchema = z.strictObject({
  decision: z.enum(['APPROVE', 'REJECT']),
  decided_utc: UtcTimestampSchema,
  operator_note: z.string().nullable(),
  decision_scope: z.enum(['LOCAL_DEMO_ONLY', 'BACKEND_CONFIRMED']),
});

export const CrabRecommendationSchema = z.strictObject({
  id: z.string().min(1),
  created_utc: UtcTimestampSchema,
  title: z.string().min(1),
  priority: ManualPrioritySchema,
  rationale: z.string().min(1),
  risk: z.string().min(1),
  status: ManualReviewStatusSchema,
  manual_review_required: z.literal(true),
  auto_apply: z.literal(false),
  decision: ManualDecisionRecordSchema.nullable(),
  mock_only: MockOnlyExtensionSchema.optional(),
});

export const CrabRecommendationsResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  items: z.array(CrabRecommendationSchema),
});

export const CrabRecommendationDecisionResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  item: CrabRecommendationSchema,
});

export const CrabNoteSchema = z.strictObject({
  id: z.string().min(1),
  created_utc: UtcTimestampSchema,
  immutable_timestamp: z.literal(true),
  title: z.string().min(1),
  body: z.string().min(1),
  weaknesses: z.array(z.string().min(1)),
  risky_changes: z.array(z.string().min(1)),
  proposals: z.array(z.string().min(1)),
  status: ManualReviewStatusSchema,
  manual_review_required: z.literal(true),
  auto_apply: z.literal(false),
  decision: ManualDecisionRecordSchema.nullable(),
  mock_only: MockOnlyExtensionSchema.optional(),
});

export const CrabNotesResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  items: z.array(CrabNoteSchema),
});

export const CrabNoteDecisionResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  item: CrabNoteSchema,
});

export const FixCodeProposalSchema = z.strictObject({
  id: z.string().min(1),
  created_utc: UtcTimestampSchema,
  title: z.string().min(1),
  error_summary: z.string().min(1),
  proposed_fix: z.string().min(1),
  affected_files: z.array(z.string().min(1)),
  risk_level: ManualRiskSchema,
  test_status: z.enum(['NOT_RUN', 'PASS', 'FAIL']),
  diff_preview: z.string(),
  status: ManualReviewStatusSchema,
  manual_review_required: z.literal(true),
  auto_apply: z.literal(false),
  decision: ManualDecisionRecordSchema.nullable(),
  mock_only: MockOnlyExtensionSchema.optional(),
});

export const FixCodeResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  items: z.array(FixCodeProposalSchema),
});

export const FixCodeDecisionResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  item: FixCodeProposalSchema,
});

export const DiaryEntrySummarySchema = z.strictObject({
  id: z.string().min(1),
  created_utc: UtcTimestampSchema,
  title: z.string().min(1),
  mood: z.string().min(1),
  mode: z.string().min(1),
  day_conclusion: z.string().min(1),
  related_run_ids: z.array(z.string().min(1)),
  mock_only: MockOnlyExtensionSchema.optional(),
});

export const DiaryEntrySchema = DiaryEntrySummarySchema.extend({
  observations: z.array(z.string().min(1)),
  doubts: z.array(z.string().min(1)),
  goals: z.array(z.string().min(1)),
  body: z.string().min(1),
}).strict();

export const DiaryQuerySchema = z.strictObject({
  query: z.string().max(200).optional(),
  date_from: UtcTimestampSchema.optional(),
  date_to: UtcTimestampSchema.optional(),
});

export const DiaryResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  entries: z.array(DiaryEntrySummarySchema),
});

export const DiaryDetailResponseSchema = z.strictObject({
  meta: DashboardDataMetaSchema,
  entry: DiaryEntrySchema,
});

export type DashboardDataMeta = z.infer<typeof DashboardDataMetaSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type SystemStatusResponse = z.infer<typeof SystemStatusResponseSchema>;
export type SystemResourcesResponse = z.infer<typeof SystemResourcesResponseSchema>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export type ActivityResponse = z.infer<typeof ActivityResponseSchema>;
export type ActivityQuery = z.input<typeof ActivityQuerySchema>;
export type MonkeyCurrentResponse = z.infer<typeof MonkeyCurrentResponseSchema>;
export type MonkeyRunsResponse = z.infer<typeof MonkeyRunsResponseSchema>;
export type MonkeyRunDetailResponse = z.infer<typeof MonkeyRunDetailResponseSchema>;
export type StructureCurrentResponse = z.infer<typeof StructureCurrentResponseSchema>;
export type ForecastHorizon = z.infer<typeof ForecastHorizonSchema>;
export type OrderHistoryOrigin = z.infer<typeof OrderHistoryOriginSchema>;
export type OrderHistoryQuery = z.infer<typeof OrderHistoryQuerySchema>;
export type OrderHistoryResponse = z.infer<typeof OrderHistoryResponseSchema>;
export type OrderHistoryDetailResponse = z.infer<typeof OrderHistoryDetailResponseSchema>;
export type SelectOrderOriginRequest = z.infer<typeof SelectOrderOriginRequestSchema>;
export type SelectOrderOriginResponse = z.infer<typeof SelectOrderOriginResponseSchema>;
export type ManualDecisionRequest = z.infer<typeof ManualDecisionRequestSchema>;
export type CrabRecommendation = z.infer<typeof CrabRecommendationSchema>;
export type CrabRecommendationsResponse = z.infer<typeof CrabRecommendationsResponseSchema>;
export type CrabRecommendationDecisionResponse = z.infer<
  typeof CrabRecommendationDecisionResponseSchema
>;
export type CrabNote = z.infer<typeof CrabNoteSchema>;
export type CrabNotesResponse = z.infer<typeof CrabNotesResponseSchema>;
export type CrabNoteDecisionResponse = z.infer<typeof CrabNoteDecisionResponseSchema>;
export type FixCodeProposal = z.infer<typeof FixCodeProposalSchema>;
export type FixCodeResponse = z.infer<typeof FixCodeResponseSchema>;
export type FixCodeDecisionResponse = z.infer<typeof FixCodeDecisionResponseSchema>;
export type DiaryQuery = z.infer<typeof DiaryQuerySchema>;
export type DiaryEntry = z.infer<typeof DiaryEntrySchema>;
export type DiaryResponse = z.infer<typeof DiaryResponseSchema>;
export type DiaryDetailResponse = z.infer<typeof DiaryDetailResponseSchema>;
export type JointPublicationMode = z.infer<typeof JointPublicationModeSchema>;
export type WallStreetStatus = z.infer<typeof WallStreetStatusSchema>;
export type WallStreetSystemState = z.infer<typeof WallStreetSystemStateSchema>;
