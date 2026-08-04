import { z } from 'zod';

import {
  ForecastHorizonSchema,
  OrderSelectionSchema,
  type ForecastHorizon,
} from '../domain/dashboardContracts';
import {
  MonkeyAssetSchema,
  Sha256Schema,
  UtcTimestampSchema,
  type MonkeyAsset,
} from '../domain/monkeyContracts';

export const ORDER_SELECTION_STORAGE_KEY =
  'fincept-monkey-dashboard:order-selection:v1' as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const StoredSelectionSchema = z.strictObject({
  origin_id: Sha256Schema,
  asset: MonkeyAssetSchema,
  horizon_hours: ForecastHorizonSchema,
  selected_utc: UtcTimestampSchema,
  selection_deadline_utc: UtcTimestampSchema,
});

const SelectionStateSchema = z
  .strictObject({
    schema_version: z.literal('DASHBOARD_ORDER_SELECTIONS_V1'),
    selections: z.record(z.string(), StoredSelectionSchema),
  })
  .superRefine((value, context) => {
    for (const [key, selection] of Object.entries(value.selections)) {
      if (key !== selectionGroupKey(selection.asset, selection.horizon_hours)) {
        context.addIssue({
          code: 'custom',
          path: ['selections', key],
          message: 'Selection is stored under the wrong asset+horizon group',
        });
      }
    }
  });

const SelectInputSchema = z.strictObject({
  origin_id: Sha256Schema,
  asset: MonkeyAssetSchema,
  horizon_hours: ForecastHorizonSchema,
  selection_deadline_utc: UtcTimestampSchema,
  expected_selected_origin_id: Sha256Schema.nullable().optional(),
});

export type StoredOrderSelection = z.infer<typeof StoredSelectionSchema>;
export type OrderSelection = z.infer<typeof OrderSelectionSchema>;
export type SelectOrderInput = z.infer<typeof SelectInputSchema>;

export class OrderSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderSelectionError';
  }
}

export class OrderSelectionConflictError extends OrderSelectionError {
  readonly current_origin_id: string | null;

  constructor(current_origin_id: string | null) {
    super('The selected forecast changed before this replacement was saved.');
    this.name = 'OrderSelectionConflictError';
    this.current_origin_id = current_origin_id;
  }
}

export class OrderSelectionWindowClosedError extends OrderSelectionError {
  constructor() {
    super('The forecast selection window has closed.');
    this.name = 'OrderSelectionWindowClosedError';
  }
}

export function selectionGroupKey(asset: MonkeyAsset, horizon_hours: ForecastHorizon): string {
  return `${asset}:${horizon_hours}`;
}

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function defaultStorage(): StorageLike {
  if (typeof window !== 'undefined') {
    try {
      const storage = window.localStorage;
      const probe = `${ORDER_SELECTION_STORAGE_KEY}:probe`;
      storage.setItem(probe, '1');
      storage.removeItem(probe);
      return storage;
    } catch {
      // Privacy modes can expose localStorage but reject all access.
    }
  }
  return new MemoryStorage();
}

function emptyState(): z.infer<typeof SelectionStateSchema> {
  return {
    schema_version: 'DASHBOARD_ORDER_SELECTIONS_V1',
    selections: {},
  };
}

export interface OrderSelectionRepositoryOptions {
  storage?: StorageLike;
  now?: () => Date;
}

/**
 * Local-only selection adapter. A map key is the asset+horizon group, so a
 * successful write can never leave two active origins in the same group.
 */
export class OrderSelectionRepository {
  private readonly storage: StorageLike;
  private readonly now: () => Date;

  constructor(options: OrderSelectionRepositoryOptions = {}) {
    this.storage = options.storage ?? defaultStorage();
    this.now = options.now ?? (() => new Date());
  }

  getSelection(
    asset: MonkeyAsset,
    horizon_hours: ForecastHorizon,
  ): StoredOrderSelection | null {
    return this.readState().selections[selectionGroupKey(asset, horizon_hours)] ?? null;
  }

  listSelections(): StoredOrderSelection[] {
    return Object.values(this.readState().selections).sort((left, right) =>
      left.selected_utc.localeCompare(right.selected_utc),
    );
  }

  select(input: SelectOrderInput): OrderSelection {
    const candidate = SelectInputSchema.parse(input);
    const now = this.now();
    const nowUtc = now.toISOString();
    if (now.getTime() >= Date.parse(candidate.selection_deadline_utc)) {
      throw new OrderSelectionWindowClosedError();
    }

    const state = this.readState();
    const key = selectionGroupKey(candidate.asset, candidate.horizon_hours);
    const current = state.selections[key] ?? null;
    if (
      candidate.expected_selected_origin_id !== undefined &&
      candidate.expected_selected_origin_id !== (current?.origin_id ?? null)
    ) {
      throw new OrderSelectionConflictError(current?.origin_id ?? null);
    }

    if (current?.origin_id === candidate.origin_id) {
      return OrderSelectionSchema.parse({
        origin_id: current.origin_id,
        asset: current.asset,
        horizon_hours: current.horizon_hours,
        selected_utc: current.selected_utc,
        replaced_origin_id: null,
        storage_scope: 'LOCAL_BROWSER',
      });
    }

    state.selections[key] = StoredSelectionSchema.parse({
      origin_id: candidate.origin_id,
      asset: candidate.asset,
      horizon_hours: candidate.horizon_hours,
      selected_utc: nowUtc,
      selection_deadline_utc: candidate.selection_deadline_utc,
    });
    this.writeState(state);

    return OrderSelectionSchema.parse({
      origin_id: candidate.origin_id,
      asset: candidate.asset,
      horizon_hours: candidate.horizon_hours,
      selected_utc: nowUtc,
      replaced_origin_id: current?.origin_id ?? null,
      storage_scope: 'LOCAL_BROWSER',
    });
  }

  clearSelection(
    asset: MonkeyAsset,
    horizon_hours: ForecastHorizon,
    expected_origin_id?: string,
  ): void {
    const state = this.readState();
    const key = selectionGroupKey(asset, horizon_hours);
    const current = state.selections[key] ?? null;
    if (expected_origin_id !== undefined) {
      Sha256Schema.parse(expected_origin_id);
      if (current?.origin_id !== expected_origin_id) {
        throw new OrderSelectionConflictError(current?.origin_id ?? null);
      }
    }
    if (current === null) return;
    delete state.selections[key];
    this.writeState(state);
  }

  clearAll(): void {
    this.storage.removeItem(ORDER_SELECTION_STORAGE_KEY);
  }

  private readState(): z.infer<typeof SelectionStateSchema> {
    const raw = this.storage.getItem(ORDER_SELECTION_STORAGE_KEY);
    if (raw === null) return emptyState();
    try {
      return SelectionStateSchema.parse(JSON.parse(raw));
    } catch {
      // Corrupt or older local state is ignored, never executed or merged.
      return emptyState();
    }
  }

  private writeState(state: z.infer<typeof SelectionStateSchema>): void {
    const validated = SelectionStateSchema.parse(state);
    this.storage.setItem(ORDER_SELECTION_STORAGE_KEY, JSON.stringify(validated));
  }
}
