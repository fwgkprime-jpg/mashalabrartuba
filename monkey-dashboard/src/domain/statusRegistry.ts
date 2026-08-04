export const knownStatusCodes = [
  'ONLINE',
  'ACTIVE',
  'RUNNING',
  'DEGRADED',
  'UNAVAILABLE',
  'WITHHELD',
  'FORTNITE_ONLY',
  'COMPLETE',
  'FAILED',
  'PAUSED',
  'STALE',
  'MOCK',
  'OFFLINE',
  'PENDING',
] as const;

export type KnownStatusCode = (typeof knownStatusCodes)[number];
export type StatusCode = KnownStatusCode | 'UNKNOWN';

export type StatusTone = 'positive' | 'info' | 'warning' | 'danger' | 'muted' | 'mock';

export interface StatusDefinition {
  label: string;
  tone: StatusTone;
  description: string;
}

export const statusRegistry: Record<StatusCode, StatusDefinition> = {
  ONLINE: { label: 'Online', tone: 'positive', description: 'Service is reachable.' },
  ACTIVE: { label: 'Active', tone: 'positive', description: 'Module is operating normally.' },
  RUNNING: { label: 'Running', tone: 'info', description: 'A run is currently in progress.' },
  DEGRADED: { label: 'Degraded', tone: 'warning', description: 'Module is available with reduced reliability.' },
  UNAVAILABLE: { label: 'Unavailable', tone: 'danger', description: 'Module cannot currently provide data.' },
  WITHHELD: { label: 'Withheld', tone: 'warning', description: 'Publication was deliberately withheld.' },
  FORTNITE_ONLY: { label: 'Fortnite only', tone: 'warning', description: 'Only the FORTNITE result is available.' },
  COMPLETE: { label: 'Complete', tone: 'positive', description: 'The operation completed successfully.' },
  FAILED: { label: 'Failed', tone: 'danger', description: 'The operation failed.' },
  PAUSED: { label: 'Paused', tone: 'muted', description: 'The operation is paused.' },
  STALE: { label: 'Stale', tone: 'warning', description: 'Data is older than the freshness window.' },
  MOCK: { label: 'Mock', tone: 'mock', description: 'This value comes from the demo data source.' },
  OFFLINE: { label: 'Offline', tone: 'danger', description: 'Module is not connected.' },
  PENDING: { label: 'Pending', tone: 'muted', description: 'Module is waiting for review or data.' },
  UNKNOWN: { label: 'Unknown', tone: 'muted', description: 'The source returned an unrecognized state.' },
};

export function normalizeStatus(value: unknown): StatusCode {
  if (typeof value !== 'string') return 'UNKNOWN';
  const normalized = value.trim().toUpperCase();
  return (knownStatusCodes as readonly string[]).includes(normalized)
    ? (normalized as KnownStatusCode)
    : 'UNKNOWN';
}

export function statusForRun(value: string): StatusCode {
  if (value === 'RUNNING') return 'RUNNING';
  if (value.startsWith('COMPLETE')) return value.includes('FORTNITE_ONLY') ? 'FORTNITE_ONLY' : 'COMPLETE';
  if (value.startsWith('FAILED')) return 'FAILED';
  return normalizeStatus(value);
}

export function statusForPublication(value: string): StatusCode {
  if (value === 'FORTNITE_ONLY') return 'FORTNITE_ONLY';
  if (value.includes('WITHHELD')) return 'WITHHELD';
  if (value === 'NONE') return 'PENDING';
  return 'ACTIVE';
}

export function statusForManualReview(value: string): StatusCode {
  if (value === 'APPROVED' || value === 'REVIEWED') return 'COMPLETE';
  if (value === 'REJECTED') return 'WITHHELD';
  if (value === 'NEW') return 'PENDING';
  return 'UNKNOWN';
}

export function statusForReliability(value: string): StatusCode {
  if (value === 'RELIABLE') return 'ACTIVE';
  if (value === 'DEGRADED' || value === 'UNVALIDATED_SIGN') return 'DEGRADED';
  if (value === 'STALE') return 'STALE';
  if (value === 'UNUSABLE') return 'UNAVAILABLE';
  return 'UNKNOWN';
}
