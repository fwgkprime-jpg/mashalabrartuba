import { z } from 'zod';

/**
 * Safe MONKEY wire contracts observed in the current one-button pipeline.
 *
 * Keep these schemas in snake_case: they describe immutable producer output,
 * not a view model. Dashboard-only projections live in dashboardContracts.ts.
 */

const UTC_TIMESTAMP_PATTERN =
  /^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?Z$/;

export const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
export const UtcTimestampSchema = z.string().regex(UTC_TIMESTAMP_PATTERN);
export const NonEmptyStringSchema = z.string().min(1);
export const NonNegativeIntegerSchema = z.number().int().nonnegative();
export const PositiveIntegerSchema = z.number().int().positive();

export const MonkeyAssetSchema = z.enum(['BTC', 'ETH']);
export const FortniteAssetSymbolSchema = z.enum(['BTCUSDT', 'ETHUSDT']);
export const MonkeyRunModeSchema = z.enum(['LIVE', 'DRY_RUN']);

export const MonkeyCanonicalStageSchema = z.enum([
  'PREFLIGHT',
  'FORTNITE',
  'GAMMA',
  'DOTA',
  'MONKEY_ASSEMBLY',
  'WALL_STREET',
  'RELEASE',
  'EVALUATION',
  'FINALIZE',
]);

export const MonkeyCheckpointStageSchema = z.enum([
  ...MonkeyCanonicalStageSchema.options,
  'DOTA_ROUND_1',
  'DOTA_ROUND_2',
  'DOTA_ROUND_3',
  'DOTA_ROUND_4',
]);

export const MonkeyStageStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETE',
  'FAILED',
  'SKIPPED_FAIL_CLOSED',
]);

export const MonkeyCheckpointStatusSchema = z.enum(['COMPLETE', 'FAILED']);
export const MonkeyRunStatusSchema = z.enum([
  'RUNNING',
  'COMPLETE',
  'COMPLETE_FORTNITE_ONLY',
  'FAILED',
  'FAILED_POST_FORTNITE',
]);

export const PerAssetPublicationModeSchema = z.enum([
  'FORTNITE_AND_DOTA',
  'FORTNITE_AND_DOTA_WITH_WARNING',
  'FORTNITE_ONLY',
]);

export const JointPublicationModeSchema = z.enum([
  ...PerAssetPublicationModeSchema.options,
  'MIXED_PER_ASSET',
]);

export const ManifestPublicationModeSchema = z.enum([
  'NONE',
  ...JointPublicationModeSchema.options,
]);

export const WallStreetStatusSchema = z.enum([
  'OVERLAY_ACCEPTED',
  'OVERLAY_WARNING',
  'OVERLAY_WITHHELD',
  'REVIEW_UNAVAILABLE',
]);

export const WallStreetSystemStateSchema = z.enum([
  'WALL_STREET_ACTIVE',
  'DOTA_FRAME_REVIEW_REQUIRED',
  'DOTA_PUBLICATION_SUSPENDED',
]);

export const MonkeyArtifactRefSchema = z.strictObject({
  path: NonEmptyStringSchema,
  sha256: Sha256Schema,
  byte_length: PositiveIntegerSchema,
});

export const MonkeySafeErrorSchema = z.strictObject({
  stage: NonEmptyStringSchema,
  code: NonEmptyStringSchema,
  message: z.string().max(500),
  at_utc: UtcTimestampSchema,
  fallback_error_code: NonEmptyStringSchema.optional(),
});

export const MonkeyStageEntrySchema = z.strictObject({
  status: MonkeyStageStatusSchema,
  started_utc: UtcTimestampSchema.nullable(),
  finished_utc: UtcTimestampSchema.nullable(),
  checkpoint: NonEmptyStringSchema.nullable(),
  artifacts: z.record(z.string(), MonkeyArtifactRefSchema),
  reason_codes: z.array(NonEmptyStringSchema),
});

export const MonkeyStagesSchema = z.strictObject({
  PREFLIGHT: MonkeyStageEntrySchema,
  FORTNITE: MonkeyStageEntrySchema,
  GAMMA: MonkeyStageEntrySchema,
  DOTA: MonkeyStageEntrySchema,
  MONKEY_ASSEMBLY: MonkeyStageEntrySchema,
  WALL_STREET: MonkeyStageEntrySchema,
  RELEASE: MonkeyStageEntrySchema,
  EVALUATION: MonkeyStageEntrySchema,
  FINALIZE: MonkeyStageEntrySchema,
});

export const MonkeyCountersSchema = z.strictObject({
  fortnite_deliveries: NonNegativeIntegerSchema,
  dota_deliveries: NonNegativeIntegerSchema,
  wall_street_deliveries: NonNegativeIntegerSchema,
  model_http_attempts: NonNegativeIntegerSchema,
  dota_http_attempts: NonNegativeIntegerSchema,
  wall_street_http_attempts: NonNegativeIntegerSchema,
  deribit_calls: NonNegativeIntegerSchema,
  background_workers_remaining: NonNegativeIntegerSchema,
  trading_actions: z.literal(0),
});

export const MonkeyRunManifestSchema = z.strictObject({
  schema_version: z.literal('MONKEY_ONE_BUTTON_RUN_MANIFEST_V1'),
  pipeline_version: z.literal('MONKEY_ONE_BUTTON_LIVE_PIPELINE_V1'),
  run_id: NonEmptyStringSchema,
  mode: MonkeyRunModeSchema,
  status: MonkeyRunStatusSchema,
  created_utc: UtcTimestampSchema,
  updated_utc: UtcTimestampSchema,
  run_dir: NonEmptyStringSchema,
  stages: MonkeyStagesSchema,
  counters: MonkeyCountersSchema,
  publication: ManifestPublicationModeSchema,
  fortnite_byte_identity: z.enum(['NOT_RUN', 'PASS']),
  secret_leak_detected: z.boolean(),
  sealed_holdout_read: z.boolean(),
  commit_created: z.boolean(),
  final_result: MonkeyArtifactRefSchema.nullable(),
  audit_result: MonkeyArtifactRefSchema.nullable(),
  last_error: MonkeySafeErrorSchema.nullable(),
  manifest_sha256: Sha256Schema,
});

/**
 * `details` is intentionally a strict JSON object boundary rather than a
 * guessed union. The producer defines it as a stage-specific mapping and adds
 * fields per stage. Consumers must branch on `stage` before interpreting it.
 */
export const MonkeyCheckpointSchema = z.strictObject({
  schema_version: z.literal('MONKEY_ONE_BUTTON_CHECKPOINT_V1'),
  sequence: PositiveIntegerSchema,
  stage: MonkeyCheckpointStageSchema,
  status: MonkeyCheckpointStatusSchema,
  completed_utc: UtcTimestampSchema,
  artifacts: z.record(z.string(), MonkeyArtifactRefSchema),
  details: z.record(z.string(), z.unknown()),
  checkpoint_sha256: Sha256Schema,
});

export const PriceBoundsSchema = z
  .tuple([z.number().finite(), z.number().finite()])
  .refine(([low, high]) => low <= high, 'Lower bound must not exceed upper bound');

export const FortniteForecastContextSchema = z
  .strictObject({
    schema_version: z.literal('FORTNITE_FINAL_FORECAST_CONTEXT_V1'),
    final_status: z.literal('FINAL'),
    asset: FortniteAssetSymbolSchema,
    origin_time_utc: UtcTimestampSchema,
    finalized_at_utc: UtcTimestampSchema,
    forecast_window: z.strictObject({
      start_utc: UtcTimestampSchema,
      end_utc: UtcTimestampSchema,
    }),
    p80: PriceBoundsSchema,
    p90: PriceBoundsSchema,
  })
  .superRefine((value, context) => {
    if (value.p90[0] > value.p80[0] || value.p90[1] < value.p80[1]) {
      context.addIssue({
        code: 'custom',
        path: ['p90'],
        message: 'P90 must enclose P80',
      });
    }
  });

export const DotaRelationSchema = z.enum([
  'CONFIRMS',
  'WEAKENS',
  'NEUTRAL',
  'UNRELIABLE',
]);
export const DotaMechanismSchema = z.enum([
  'PINNING',
  'DAMPENING',
  'BREAKOUT_AMPLIFICATION',
  'ASYMMETRIC_TAIL',
  'NONE',
  'UNKNOWN',
]);
export const DotaRiskSideSchema = z.enum(['UPPER', 'LOWER', 'BOTH', 'NONE']);

const DotaTranscriptHashesSchema = z.strictObject({
  round_1_input: Sha256Schema,
  after_round_1: Sha256Schema,
  round_2_input: Sha256Schema,
  after_round_2: Sha256Schema,
  round_3_input: Sha256Schema,
  after_round_3: Sha256Schema,
  round_4_input: Sha256Schema,
  after_round_4: Sha256Schema,
});

export const DotaGammaLevelSchema = z.strictObject({
  type: z.literal('GAMMA_STRIKE'),
  strike: z.number().finite().positive(),
  evidence_field: z.literal('normalized.gamma_walls'),
});

export const DotaScenarioSchema = z.strictObject({
  type: z.literal('CONDITIONAL_GAMMA_CONTEXT'),
  mechanism: DotaMechanismSchema,
  risk_side: DotaRiskSideSchema,
  evidence_field_references: z.array(NonEmptyStringSchema),
});

/** Current Python runtime authority, not the legacy DOTA_OVERLAY_V1 schema. */
export const CurrentDotaOverlaySchema = z
  .strictObject({
    schema_version: z.literal('DOTA_MVP5_1_EPISTEMIC_CE_OVERLAY_V1'),
    fixture_only: z.boolean(),
    fortnite_input_sha256: Sha256Schema,
    fortnite_byte_length_before: PositiveIntegerSchema,
    fortnite_sha256_before: Sha256Schema,
    fortnite_byte_length_after: PositiveIntegerSchema,
    fortnite_sha256_after: Sha256Schema,
    transcript_sha256_by_round: DotaTranscriptHashesSchema,
    effective: z.boolean(),
    status: z.enum(['GAMMA_EFFECTIVE', 'GAMMA_UNRELIABLE']),
    relation_to_fortnite: DotaRelationSchema,
    gamma_mechanism: DotaMechanismSchema,
    risk_side: DotaRiskSideSchema,
    evidence_grade: NonEmptyStringSchema,
    mechanism_plausibility: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    predictive_support: z.enum(['NONE', 'WEAK', 'MODERATE']),
    epistemic_context_sha256: Sha256Schema,
    gamma_levels: z.array(DotaGammaLevelSchema),
    scenarios: z.array(DotaScenarioSchema),
    blockers: z.array(NonEmptyStringSchema),
  })
  .superRefine((value, context) => {
    if (value.fortnite_byte_length_before !== value.fortnite_byte_length_after) {
      context.addIssue({
        code: 'custom',
        path: ['fortnite_byte_length_after'],
        message: 'FORTNITE byte length changed',
      });
    }
    if (value.fortnite_sha256_before !== value.fortnite_sha256_after) {
      context.addIssue({
        code: 'custom',
        path: ['fortnite_sha256_after'],
        message: 'FORTNITE hash changed',
      });
    }
    if (
      !value.effective &&
      (value.status !== 'GAMMA_UNRELIABLE' ||
        value.relation_to_fortnite !== 'UNRELIABLE' ||
        value.gamma_mechanism !== 'UNKNOWN' ||
        value.risk_side !== 'NONE' ||
        value.gamma_levels.length !== 0 ||
        value.scenarios.length !== 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'An ineffective DOTA overlay must use fail-closed values',
      });
    }
  });

export const FortniteArtifactPointerSchema = z.strictObject({
  sha256: Sha256Schema,
  byte_length: PositiveIntegerSchema,
  artifact_ref: NonEmptyStringSchema,
});

export const PublicationWarningBlockSchema = z.strictObject({
  severity: z.literal('WARNING'),
  reason_codes: z.array(NonEmptyStringSchema),
  limitations: z.array(NonEmptyStringSchema),
  message: NonEmptyStringSchema,
});

export const MonkeyPerAssetPublicResultSchema = z
  .strictObject({
    schema_version: z.literal('MONKEY_PUBLIC_RESULT_V1'),
    origin_id: Sha256Schema,
    asset: MonkeyAssetSchema,
    fortnite: FortniteArtifactPointerSchema,
    wall_street_status: WallStreetStatusSchema,
    system_state: WallStreetSystemStateSchema,
    effective_publication: PerAssetPublicationModeSchema,
    status_message: NonEmptyStringSchema,
    publication_decision_sha256: Sha256Schema,
    dota_overlay: CurrentDotaOverlaySchema.optional(),
    warning_block: PublicationWarningBlockSchema.optional(),
    public_result_sha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (value.effective_publication === 'FORTNITE_ONLY' && value.dota_overlay !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['dota_overlay'],
        message: 'FORTNITE_ONLY must not publish a DOTA overlay',
      });
    }
    if (value.effective_publication !== 'FORTNITE_ONLY' && value.dota_overlay === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['dota_overlay'],
        message: 'A combined publication must include a DOTA overlay',
      });
    }
    if (
      value.effective_publication === 'FORTNITE_AND_DOTA_WITH_WARNING' &&
      value.warning_block === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['warning_block'],
        message: 'Warning publication must include warning_block',
      });
    }
  });

export const MonkeyFailClosedAssetResultSchema = z.strictObject({
  asset: MonkeyAssetSchema,
  wall_street_status: z.literal('REVIEW_UNAVAILABLE'),
  system_state: z.literal('WALL_STREET_ACTIVE'),
  effective_publication: z.literal('FORTNITE_ONLY'),
  reason_codes: z.array(NonEmptyStringSchema),
});

export const MonkeyJointAssetResultSchema = z.union([
  MonkeyPerAssetPublicResultSchema,
  MonkeyFailClosedAssetResultSchema,
]);

const MonkeyJointAssetsSchema = z
  .strictObject({
    BTC: MonkeyJointAssetResultSchema,
    ETH: MonkeyJointAssetResultSchema,
  })
  .superRefine((value, context) => {
    if (value.BTC.asset !== 'BTC') {
      context.addIssue({ code: 'custom', path: ['BTC', 'asset'], message: 'Expected BTC' });
    }
    if (value.ETH.asset !== 'ETH') {
      context.addIssue({ code: 'custom', path: ['ETH', 'asset'], message: 'Expected ETH' });
    }
  });

export const MonkeyJointPublicResultSchema = z
  .strictObject({
    schema_version: z.literal('MONKEY_JOINT_PUBLIC_RESULT_V1'),
    pipeline_version: z.literal('MONKEY_ONE_BUTTON_LIVE_PIPELINE_V1'),
    run_id: NonEmptyStringSchema,
    fortnite_run_id: NonEmptyStringSchema,
    advisory_only: z.literal(true),
    trading_actions: z.literal(0),
    effective_publication: JointPublicationModeSchema,
    fortnite: z.strictObject({
      authoritative_artifact_ref: NonEmptyStringSchema,
      sha256: Sha256Schema,
      byte_length: PositiveIntegerSchema,
      byte_identity: z.literal('PASS'),
      contexts: z.strictObject({
        BTC: FortniteForecastContextSchema,
        ETH: FortniteForecastContextSchema,
      }),
    }),
    assets: MonkeyJointAssetsSchema,
    failure: MonkeySafeErrorSchema.nullable(),
    dota_overlay: CurrentDotaOverlaySchema.optional(),
    result_sha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (value.fortnite.contexts.BTC.asset !== 'BTCUSDT') {
      context.addIssue({
        code: 'custom',
        path: ['fortnite', 'contexts', 'BTC', 'asset'],
        message: 'Expected BTCUSDT',
      });
    }
    if (value.fortnite.contexts.ETH.asset !== 'ETHUSDT') {
      context.addIssue({
        code: 'custom',
        path: ['fortnite', 'contexts', 'ETH', 'asset'],
        message: 'Expected ETHUSDT',
      });
    }
    if (value.effective_publication === 'FORTNITE_ONLY' && value.dota_overlay !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['dota_overlay'],
        message: 'FORTNITE_ONLY joint result must not publish a DOTA overlay',
      });
    }
    if (value.effective_publication !== 'FORTNITE_ONLY' && value.dota_overlay === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['dota_overlay'],
        message: 'Combined joint result must include a DOTA overlay',
      });
    }
  });

export const MonkeyPublicationDecisionSchema = z.strictObject({
  schema_version: z.literal('MONKEY_PUBLICATION_DECISION_V1'),
  origin_id: Sha256Schema,
  asset: MonkeyAssetSchema,
  wall_street_status: WallStreetStatusSchema,
  system_state: WallStreetSystemStateSchema,
  effective_publication: PerAssetPublicationModeSchema,
  reason_codes: z.array(NonEmptyStringSchema),
  source_hashes: z.strictObject({
    review_input_sha256: Sha256Schema,
    wall_street_result_sha256: Sha256Schema,
    wall_street_audit_sha256: Sha256Schema,
    monkey_result_sha256: Sha256Schema,
    dota_overlay_sha256: Sha256Schema,
    fortnite_sha256: Sha256Schema,
    origin_event_sha256: Sha256Schema,
    system_state_sha256: Sha256Schema,
    audit_bundle_sha256: Sha256Schema,
  }),
  created_utc: UtcTimestampSchema,
});

export const MonkeyOriginEventSchema = z.strictObject({
  schema_version: z.literal('DOTA_WALL_STREET_ORIGIN_EVENT_V1'),
  origin_id: Sha256Schema,
  asset: MonkeyAssetSchema,
  origin_time_utc: UtcTimestampSchema,
  wall_street_status: WallStreetStatusSchema,
  reason_codes: z.array(NonEmptyStringSchema),
  reason_classification: z.strictObject({
    FRAME_REASON: z.array(NonEmptyStringSchema),
    CRITICAL_INVARIANT: z.array(NonEmptyStringSchema),
    OPERATIONAL_REASON: z.array(NonEmptyStringSchema),
  }),
  evaluable: z.boolean(),
  source_hashes: z.strictObject({
    review_input_sha256: Sha256Schema,
    wall_street_result_sha256: Sha256Schema,
    wall_street_audit_sha256: Sha256Schema,
    monkey_result_sha256: Sha256Schema,
    dota_overlay_sha256: Sha256Schema,
    fortnite_sha256: Sha256Schema,
  }),
  event_sha256: Sha256Schema,
});

const CounterRecordSchema = z.record(z.string(), NonNegativeIntegerSchema);

export const MonkeyWallStreetSystemStateSchema = z.strictObject({
  schema_version: z.literal('DOTA_WALL_STREET_SYSTEM_STATE_V1'),
  asset: MonkeyAssetSchema,
  system_state: WallStreetSystemStateSchema,
  ordered_event_hashes: z.array(Sha256Schema),
  active_event_hashes: z.array(Sha256Schema),
  evaluable_event_hashes: z.array(Sha256Schema),
  operational_event_hashes: z.array(Sha256Schema),
  latest_resume_receipt_sha256: Sha256Schema.nullable(),
  history_counts: z.strictObject({
    active_after_latest_resume: NonNegativeIntegerSchema,
    evaluable_after_latest_resume: NonNegativeIntegerSchema,
    operational_total: NonNegativeIntegerSchema,
    total_unique_origins: NonNegativeIntegerSchema,
  }),
  frame_counters: z.strictObject({
    consecutive_frame_withheld: NonNegativeIntegerSchema,
    critical_invariant_streaks: CounterRecordSchema,
    last_20_same_reason_counts: CounterRecordSchema,
  }),
  historical_counters: z.strictObject({
    critical_invariant_counts: CounterRecordSchema,
    frame_reason_counts: CounterRecordSchema,
    frame_withheld_total: NonNegativeIntegerSchema,
  }),
  operational_counters: CounterRecordSchema,
  state_sha256: Sha256Schema,
});

/* ------------------------------------------------------------------------- */
/* Legacy Phase-3 artifact. Explicitly NOT the current runtime authority.     */
/* ------------------------------------------------------------------------- */

export const LEGACY_MONKEY_RESULT_V1_RUNTIME_AUTHORITY = false as const;

export const LegacyMonkeyArtifactRoleSchema = z.enum([
  'CANONICAL_PAYLOAD',
  'SNAPSHOT_ENVELOPE',
  'FINAL_VERDICT',
  'RUN_MANIFEST',
  'SHA256SUMS',
]);

const LegacyPointerRefSchema = z.strictObject({
  artifact_role: NonEmptyStringSchema,
  source_path: NonEmptyStringSchema,
  source_sha256: Sha256Schema,
  json_pointers: z.array(z.string().startsWith('/')).min(1).max(4),
});

export const LegacyMonkeyResultV1Schema = z.strictObject({
  schema_version: z.literal('MONKEY_RESULT_V1'),
  monkey_run_id: NonEmptyStringSchema,
  created_at_utc: UtcTimestampSchema,
  fortnite_authority: z.strictObject({
    artifacts: z
      .array(
        z.strictObject({
          role: LegacyMonkeyArtifactRoleSchema,
          source_path: NonEmptyStringSchema,
          opaque_copy_path: z.string().regex(/\.bin$/),
          byte_length: PositiveIntegerSchema,
          sha256: Sha256Schema,
          manifest_sha256: Sha256Schema.nullable(),
        }),
      )
      .length(5),
  }),
  fortnite_parsed_view: z
    .strictObject({
      authoritative: z.literal(false),
      display_refs: z.array(LegacyPointerRefSchema),
    })
    .optional(),
  dota_overlay_ref: z.strictObject({
    path: NonEmptyStringSchema,
    byte_length: PositiveIntegerSchema,
    sha256: Sha256Schema,
    removable: z.literal(true),
  }),
  combined_interpretation: z.strictObject({
    rendering_mode: z.literal('DETERMINISTIC_TEMPLATE_V1'),
    template_id: z.enum(['DOTA_EFFECTIVE_CONTEXT_V1', 'DOTA_UNRELIABLE_CONTEXT_V1']),
    public_labels: z.array(NonEmptyStringSchema).min(1),
    gamma_mechanism: DotaMechanismSchema,
    risk_side: DotaRiskSideSchema,
    evidence_field_refs: z.array(NonEmptyStringSchema).max(32),
    overlay_sha256: Sha256Schema,
    rendered_text_sha256: Sha256Schema.nullable(),
  }),
  provenance: z.strictObject({
    code_sha256: Sha256Schema,
    schema_sha256: Sha256Schema,
    prompt_sha256s: z.array(Sha256Schema).min(3),
    evidence_pack_sha256: Sha256Schema,
    vote_sha256s: z.array(Sha256Schema).length(6),
    context_sha256s: z.array(Sha256Schema).min(2),
  }),
  fortnite_unchanged: z.literal(true),
  monkey_manifest_sha256: Sha256Schema,
});

export type MonkeyAsset = z.infer<typeof MonkeyAssetSchema>;
export type MonkeyRunManifest = z.infer<typeof MonkeyRunManifestSchema>;
export type MonkeyCheckpoint = z.infer<typeof MonkeyCheckpointSchema>;
export type FortniteForecastContext = z.infer<typeof FortniteForecastContextSchema>;
export type CurrentDotaOverlay = z.infer<typeof CurrentDotaOverlaySchema>;
export type MonkeyPerAssetPublicResult = z.infer<typeof MonkeyPerAssetPublicResultSchema>;
export type MonkeyJointPublicResult = z.infer<typeof MonkeyJointPublicResultSchema>;
export type MonkeyPublicationDecision = z.infer<typeof MonkeyPublicationDecisionSchema>;
export type MonkeyOriginEvent = z.infer<typeof MonkeyOriginEventSchema>;
export type MonkeyWallStreetSystemState = z.infer<typeof MonkeyWallStreetSystemStateSchema>;
export type LegacyMonkeyResultV1 = z.infer<typeof LegacyMonkeyResultV1Schema>;
