import { describe, expect, it } from 'vitest';

import {
  normalizeStatus,
  statusForManualReview,
  statusForPublication,
  statusForReliability,
  statusForRun,
  statusRegistry,
} from './statusRegistry';

describe('statusRegistry', () => {
  it('normalizes known values without trusting casing or whitespace', () => {
    expect(normalizeStatus('  offline ')).toBe('OFFLINE');
    expect(normalizeStatus('pending')).toBe('PENDING');
    expect(statusRegistry.MOCK.tone).toBe('mock');
  });

  it('maps unknown and non-string values to the visible UNKNOWN fallback', () => {
    expect(normalizeStatus('FUTURE_ENUM_VALUE')).toBe('UNKNOWN');
    expect(normalizeStatus(null)).toBe('UNKNOWN');
  });

  it('projects producer run and publication statuses into the shared registry', () => {
    expect(statusForRun('COMPLETE_FORTNITE_ONLY')).toBe('FORTNITE_ONLY');
    expect(statusForRun('FAILED_POST_FORTNITE')).toBe('FAILED');
    expect(statusForPublication('OVERLAY_WITHHELD')).toBe('WITHHELD');
    expect(statusForPublication('NONE')).toBe('PENDING');
  });

  it('projects manual review and evidence reliability safely', () => {
    expect(statusForManualReview('NEW')).toBe('PENDING');
    expect(statusForManualReview('REJECTED')).toBe('WITHHELD');
    expect(statusForReliability('UNVALIDATED_SIGN')).toBe('DEGRADED');
    expect(statusForReliability('UNUSABLE')).toBe('UNAVAILABLE');
    expect(statusForReliability('NEW_RELIABILITY_ENUM')).toBe('UNKNOWN');
  });
});

