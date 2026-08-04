import { describe, expect, it } from 'vitest';

import {
  OrderSelectionConflictError,
  OrderSelectionRepository,
  OrderSelectionWindowClosedError,
  type StorageLike,
} from './OrderSelectionRepository';

const fixedNow = new Date('2026-08-01T12:00:00.000Z');
const origin = (character: string) => character.repeat(64);

class TestStorage implements StorageLike {
  readonly values = new Map<string, string>();

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

function repository(storage = new TestStorage()) {
  return new OrderSelectionRepository({ storage, now: () => fixedNow });
}

function input(
  origin_id: string,
  overrides: Partial<{
    asset: 'BTC' | 'ETH';
    horizon_hours: 12 | 24;
    selection_deadline_utc: string;
    expected_selected_origin_id: string | null;
  }> = {},
) {
  return {
    origin_id,
    asset: overrides.asset ?? ('BTC' as const),
    horizon_hours: overrides.horizon_hours ?? (12 as const),
    selection_deadline_utc:
      overrides.selection_deadline_utc ?? '2026-08-01T13:00:00.000Z',
    ...(Object.hasOwn(overrides, 'expected_selected_origin_id')
      ? { expected_selected_origin_id: overrides.expected_selected_origin_id }
      : {}),
  };
}

describe('OrderSelectionRepository', () => {
  it('keeps one active origin per asset+horizon and reports safe replacement', () => {
    const target = repository();
    const first = target.select(input(origin('1'), { expected_selected_origin_id: null }));
    const second = target.select(
      input(origin('2'), { expected_selected_origin_id: first.origin_id }),
    );

    const active = target
      .listSelections()
      .filter((item) => item.asset === 'BTC' && item.horizon_hours === 12);
    expect(active).toHaveLength(1);
    expect(active[0]?.origin_id).toBe(origin('2'));
    expect(second.replaced_origin_id).toBe(origin('1'));
    expect(second.storage_scope).toBe('LOCAL_BROWSER');
  });

  it('keeps asset+horizon groups independent', () => {
    const target = repository();
    target.select(input(origin('1')));
    target.select(input(origin('2'), { horizon_hours: 24 }));
    target.select(input(origin('3'), { asset: 'ETH', horizon_hours: 12 }));

    expect(target.listSelections()).toHaveLength(3);
    expect(target.getSelection('BTC', 12)?.origin_id).toBe(origin('1'));
    expect(target.getSelection('BTC', 24)?.origin_id).toBe(origin('2'));
    expect(target.getSelection('ETH', 12)?.origin_id).toBe(origin('3'));
  });

  it('rejects a stale replacement expectation without overwriting current state', () => {
    const target = repository();
    target.select(input(origin('1')));

    expect(() =>
      target.select(input(origin('2'), { expected_selected_origin_id: null })),
    ).toThrow(OrderSelectionConflictError);
    expect(target.getSelection('BTC', 12)?.origin_id).toBe(origin('1'));
  });

  it('rejects selection after the allowed window', () => {
    const target = repository();
    expect(() =>
      target.select(
        input(origin('1'), { selection_deadline_utc: '2026-08-01T11:59:59.000Z' }),
      ),
    ).toThrow(OrderSelectionWindowClosedError);
    expect(target.listSelections()).toHaveLength(0);
  });

  it('persists a validated selection across repository reloads', () => {
    const storage = new TestStorage();
    repository(storage).select(input(origin('1')));

    const reloaded = repository(storage);
    expect(reloaded.getSelection('BTC', 12)).toMatchObject({
      origin_id: origin('1'),
      selected_utc: fixedNow.toISOString(),
    });
  });
});
