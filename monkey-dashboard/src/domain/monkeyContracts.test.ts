import { describe, expect, it } from 'vitest';

import { HealthResponseSchema } from './dashboardContracts';
import {
  LEGACY_MONKEY_RESULT_V1_RUNTIME_AUTHORITY,
  LegacyMonkeyResultV1Schema,
  MonkeyCheckpointSchema,
  MonkeyJointPublicResultSchema,
  MonkeyRunManifestSchema,
} from './monkeyContracts';

const timestamp = '2026-08-01T12:00:00.000Z';
const hash = (character: string) => character.repeat(64);

function artifact(character = 'a') {
  return { path: 'public/artifact.json', sha256: hash(character), byte_length: 128 };
}

function stage() {
  return {
    status: 'COMPLETE',
    started_utc: timestamp,
    finished_utc: timestamp,
    checkpoint: 'D:/demo/checkpoint.json',
    artifacts: {},
    reason_codes: [],
  };
}

function validManifest(): unknown {
  return {
    schema_version: 'MONKEY_ONE_BUTTON_RUN_MANIFEST_V1',
    pipeline_version: 'MONKEY_ONE_BUTTON_LIVE_PIPELINE_V1',
    run_id: 'monkey-demo',
    mode: 'LIVE',
    status: 'COMPLETE_FORTNITE_ONLY',
    created_utc: timestamp,
    updated_utc: timestamp,
    run_dir: 'D:/demo/run',
    stages: {
      PREFLIGHT: stage(),
      FORTNITE: stage(),
      GAMMA: stage(),
      DOTA: stage(),
      MONKEY_ASSEMBLY: stage(),
      WALL_STREET: stage(),
      RELEASE: stage(),
      EVALUATION: stage(),
      FINALIZE: stage(),
    },
    counters: {
      fortnite_deliveries: 21,
      dota_deliveries: 12,
      wall_street_deliveries: 3,
      model_http_attempts: 39,
      dota_http_attempts: 12,
      wall_street_http_attempts: 4,
      deribit_calls: 4,
      background_workers_remaining: 0,
      trading_actions: 0,
    },
    publication: 'FORTNITE_ONLY',
    fortnite_byte_identity: 'PASS',
    secret_leak_detected: false,
    sealed_holdout_read: false,
    commit_created: false,
    final_result: artifact('b'),
    audit_result: artifact('c'),
    last_error: null,
    manifest_sha256: hash('d'),
  };
}

function forecastContext(asset: 'BTCUSDT' | 'ETHUSDT', horizonHours: 12 | 24) {
  const p80 = asset === 'BTCUSDT' ? [63_827, 65_505] : [1_857, 1_978];
  const p90 = asset === 'BTCUSDT' ? [63_333, 65_816] : [1_827, 2_008];
  return {
    schema_version: 'FORTNITE_FINAL_FORECAST_CONTEXT_V1',
    final_status: 'FINAL',
    asset,
    origin_time_utc: timestamp,
    finalized_at_utc: timestamp,
    forecast_window: {
      start_utc: timestamp,
      end_utc: new Date(Date.parse(timestamp) + horizonHours * 3_600_000).toISOString(),
    },
    p80,
    p90,
  };
}

function perAsset(asset: 'BTC' | 'ETH', originCharacter: string) {
  return {
    schema_version: 'MONKEY_PUBLIC_RESULT_V1',
    origin_id: hash(originCharacter),
    asset,
    fortnite: {
      sha256: hash('a'),
      byte_length: 19_304,
      artifact_ref: 'fortnite/canonical_payload.json',
    },
    wall_street_status: 'OVERLAY_WITHHELD',
    system_state: 'WALL_STREET_ACTIVE',
    effective_publication: 'FORTNITE_ONLY',
    status_message: 'DOTA overlay withheld; immutable FORTNITE only.',
    publication_decision_sha256: hash('e'),
    public_result_sha256: hash(originCharacter),
  };
}

function validJointResult(): unknown {
  return {
    schema_version: 'MONKEY_JOINT_PUBLIC_RESULT_V1',
    pipeline_version: 'MONKEY_ONE_BUTTON_LIVE_PIPELINE_V1',
    run_id: 'monkey-demo',
    fortnite_run_id: 'fortnite-demo',
    advisory_only: true,
    trading_actions: 0,
    effective_publication: 'FORTNITE_ONLY',
    fortnite: {
      authoritative_artifact_ref: 'fortnite/canonical_payload.json',
      sha256: hash('a'),
      byte_length: 19_304,
      byte_identity: 'PASS',
      contexts: {
        BTC: forecastContext('BTCUSDT', 12),
        ETH: forecastContext('ETHUSDT', 24),
      },
    },
    assets: { BTC: perAsset('BTC', '1'), ETH: perAsset('ETH', '2') },
    failure: null,
    result_sha256: hash('f'),
  };
}

function validCheckpoint(): unknown {
  return {
    schema_version: 'MONKEY_ONE_BUTTON_CHECKPOINT_V1',
    sequence: 16,
    stage: 'FINALIZE',
    status: 'COMPLETE',
    completed_utc: timestamp,
    artifacts: { public_result: artifact('b') },
    details: { publication: 'FORTNITE_ONLY', background_workers_remaining: 0 },
    checkpoint_sha256: hash('c'),
  };
}

describe('current MONKEY wire schemas', () => {
  it('accepts a strict current run manifest', () => {
    const parsed = MonkeyRunManifestSchema.parse(validManifest());
    expect(parsed.status).toBe('COMPLETE_FORTNITE_ONLY');
    expect(parsed.stages.FINALIZE.status).toBe('COMPLETE');
  });

  it('rejects malformed or extended run manifests', () => {
    expect(
      MonkeyRunManifestSchema.safeParse({ ...validManifest() as object, status: 'DONE' }).success,
    ).toBe(false);
    expect(
      MonkeyRunManifestSchema.safeParse({ ...validManifest() as object, unexpected: true }).success,
    ).toBe(false);
  });

  it('accepts the current MONKEY_JOINT_PUBLIC_RESULT_V1 fail-closed shape', () => {
    const parsed = MonkeyJointPublicResultSchema.parse(validJointResult());
    expect(parsed.effective_publication).toBe('FORTNITE_ONLY');
    expect(parsed.trading_actions).toBe(0);
  });

  it('rejects malformed joint results and unsafe trading fields', () => {
    const malformed = structuredClone(validJointResult()) as Record<string, unknown>;
    malformed.trading_actions = 1;
    expect(MonkeyJointPublicResultSchema.safeParse(malformed).success).toBe(false);
  });

  it('accepts retry-safe checkpoint metadata', () => {
    const parsed = MonkeyCheckpointSchema.parse(validCheckpoint());
    expect(parsed.sequence).toBe(16);
    expect(parsed.details.publication).toBe('FORTNITE_ONLY');
  });

  it('rejects malformed checkpoint sequence and unknown stages', () => {
    expect(
      MonkeyCheckpointSchema.safeParse({ ...validCheckpoint() as object, sequence: 0 }).success,
    ).toBe(false);
    expect(
      MonkeyCheckpointSchema.safeParse({ ...validCheckpoint() as object, stage: 'FUTURE_STAGE' })
        .success,
    ).toBe(false);
  });

  it('keeps the legacy MONKEY_RESULT_V1 explicitly non-authoritative', () => {
    expect(LEGACY_MONKEY_RESULT_V1_RUNTIME_AUTHORITY).toBe(false);
    expect(LegacyMonkeyResultV1Schema.safeParse(validJointResult()).success).toBe(false);
  });

  it('rejects malformed dashboard response envelopes', () => {
    expect(HealthResponseSchema.safeParse({ status: 'ONLINE' }).success).toBe(false);
    expect(
      HealthResponseSchema.safeParse({
        meta: {
          data_mode: 'http',
          demo_data: false,
          observed_at_utc: timestamp,
          stale: false,
        },
        status: 'ONLINE',
        service: 'dashboard',
        version: 'v1',
        checked_at_utc: timestamp,
        unexpected: true,
      }).success,
    ).toBe(false);
  });
});
