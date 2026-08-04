import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockDashboardDataSource } from './MockDashboardDataSource';
import { OrderSelectionRepository } from './OrderSelectionRepository';

const fixedNow = new Date('2026-08-01T12:00:00.000Z');

function source(options: { latencyMs?: number; eventIntervalMs?: number } = {}) {
  const repository = new OrderSelectionRepository({
    storage: window.localStorage,
    now: () => fixedNow,
  });
  return new MockDashboardDataSource({
    selectionRepository: repository,
    latencyMs: options.latencyMs ?? 0,
    eventIntervalMs: options.eventIntervalMs ?? 1_000,
    now: () => fixedNow,
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MockDashboardDataSource', () => {
  it('returns visibly marked DEMO data and a valid current MONKEY result', async () => {
    const target = source();
    const [health, current, structure] = await Promise.all([
      target.getHealth(),
      target.getMonkeyCurrent(),
      target.getStructureCurrent(),
    ]);

    expect(health.meta).toMatchObject({ demo_data: true, demo_label: 'DEMO / MOCK DATA' });
    expect(current.result.schema_version).toBe('MONKEY_JOINT_PUBLIC_RESULT_V1');
    expect(current.result.trading_actions).toBe(0);
    expect(structure.assets.BTC.mock_only?.scope).toBe('DEMO_ONLY');
  });

  it('returns selection state and replaces only within one asset+horizon group', async () => {
    const target = source();
    const history = await target.getOrderHistory({ asset: 'BTC', horizon_hours: 12 });
    const [first, second] = history.origins;
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    const firstResponse = await target.selectOrderHistoryOrigin(first!.origin_id, {
      expected_selected_origin_id: null,
    });
    const secondResponse = await target.selectOrderHistoryOrigin(second!.origin_id, {
      expected_selected_origin_id: firstResponse.selection.origin_id,
    });
    const refreshed = await target.getOrderHistory({ asset: 'BTC', horizon_hours: 12 });

    expect(secondResponse.selection.replaced_origin_id).toBe(first!.origin_id);
    expect(refreshed.origins.filter((item) => item.selected_by_user)).toHaveLength(1);
    expect(refreshed.origins.find((item) => item.selected_by_user)?.origin_id).toBe(
      second!.origin_id,
    );
  });

  it('records Crab recommendation and note decisions in local demo scope only', async () => {
    const target = source();
    const recommendations = await target.getCrabRecommendations();
    const notes = await target.getCrabNotes();

    const approved = await target.decideCrabRecommendation(recommendations.items[0]!.id, {
      decision: 'APPROVE',
      operator_note: 'Reviewed in the demo UI.',
    });
    const rejected = await target.decideCrabNote(notes.items[0]!.id, {
      decision: 'REJECT',
    });

    expect(approved.item).toMatchObject({ status: 'APPROVED', auto_apply: false });
    expect(approved.item.decision?.decision_scope).toBe('LOCAL_DEMO_ONLY');
    expect(rejected.item).toMatchObject({ status: 'REJECTED', auto_apply: false });
    expect(rejected.item.decision?.decision_scope).toBe('LOCAL_DEMO_ONLY');
  });

  it('never auto-applies an approved Fix Code proposal', async () => {
    const target = source();
    const fixes = await target.getFixCode();
    const response = await target.decideFixCode(fixes.items[0]!.id, {
      decision: 'APPROVE',
    });

    expect(response.item.status).toBe('APPROVED');
    expect(response.item.auto_apply).toBe(false);
    expect(response.item.decision?.decision_scope).toBe('LOCAL_DEMO_ONLY');
  });

  it('cancels delayed mock requests with AbortSignal', async () => {
    const target = source({ latencyMs: 1_000 });
    const controller = new AbortController();
    const pending = target.getHealth(controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('stops timer events after unsubscribe', async () => {
    vi.useFakeTimers();
    const target = source({ eventIntervalMs: 1_000 });
    const onEvent = vi.fn();
    const onOpen = vi.fn();
    const unsubscribe = target.subscribeToEvents({ onEvent, onOpen });

    await Promise.resolve();
    expect(onOpen).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(onEvent).toHaveBeenCalledTimes(1);

    unsubscribe();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('stops timer events when the subscription signal aborts', async () => {
    vi.useFakeTimers();
    const target = source({ eventIntervalMs: 1_000 });
    const controller = new AbortController();
    const onEvent = vi.fn();
    target.subscribeToEvents({ onEvent }, controller.signal);

    controller.abort();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(onEvent).not.toHaveBeenCalled();
  });
});
