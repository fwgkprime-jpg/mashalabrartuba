import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'dark' | 'contrast';
export type DashboardTimeZone = 'local' | 'UTC' | 'Europe/Kyiv';

export interface DashboardSettings {
  refreshIntervalMs: number;
  timeZone: DashboardTimeZone;
  theme: ThemeMode;
}

interface SettingsContextValue extends DashboardSettings {
  updateSettings: (next: Partial<DashboardSettings>) => void;
}

const STORAGE_KEY = 'fincept-monkey-dashboard:settings:v1';
const defaults: DashboardSettings = {
  refreshIntervalMs: 30_000,
  timeZone: 'Europe/Kyiv',
  theme: 'dark',
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): DashboardSettings {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const candidate = JSON.parse(raw) as Partial<DashboardSettings>;
    return {
      refreshIntervalMs: [10_000, 30_000, 60_000, 300_000].includes(candidate.refreshIntervalMs ?? 0)
        ? candidate.refreshIntervalMs!
        : defaults.refreshIntervalMs,
      timeZone: ['local', 'UTC', 'Europe/Kyiv'].includes(candidate.timeZone ?? '')
        ? candidate.timeZone!
        : defaults.timeZone,
      theme: candidate.theme === 'contrast' ? 'contrast' : 'dark',
    };
  } catch {
    return defaults;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DashboardSettings>(loadSettings);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      updateSettings: (next) => setSettings((current) => ({ ...current, ...next })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// The provider and its colocated hook intentionally form one public settings boundary.
// eslint-disable-next-line react-refresh/only-export-components
export function useDashboardSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useDashboardSettings must be used inside SettingsProvider');
  return value;
}
