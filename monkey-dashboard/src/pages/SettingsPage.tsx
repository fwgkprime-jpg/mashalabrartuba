import { Database, RefreshCw, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  useDashboardSettings,
  type DashboardTimeZone,
  type ThemeMode,
} from '../app/settings';
import styles from './EntryPages.module.css';

const SETTINGS_STORAGE_KEY = 'fincept-monkey-dashboard:settings:v1';
const DASHBOARD_STORAGE_PREFIX = 'fincept-monkey-dashboard:';

const refreshOptions = [
  { value: 10_000, label: 'Every 10 seconds' },
  { value: 30_000, label: 'Every 30 seconds' },
  { value: 60_000, label: 'Every minute' },
  { value: 300_000, label: 'Every 5 minutes' },
] as const;

const timeZoneOptions: ReadonlyArray<{ value: DashboardTimeZone; label: string }> = [
  { value: 'local', label: 'Device local time' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Kyiv', label: 'Europe/Kyiv' },
];

const themeOptions: ReadonlyArray<{ value: ThemeMode; label: string }> = [
  { value: 'dark', label: 'Dark terminal' },
  { value: 'contrast', label: 'High contrast' },
];

function getPublicDataMode(): string {
  const configured = import.meta.env.VITE_DATA_MODE?.trim().toLowerCase();
  if (configured === 'api' || configured === 'mock') return configured;
  return 'unconfigured';
}

function getPublicApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim() || '/api/v1';

  try {
    const parsed = new URL(configured, 'https://dashboard.invalid');
    const containsCredentials =
      parsed.username.length > 0 ||
      parsed.password.length > 0 ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0;
    const hasAllowedProtocol = parsed.protocol === 'http:' || parsed.protocol === 'https:';

    if (containsCredentials) return '[redacted: use a credential-free API base URL]';
    if (!hasAllowedProtocol) return '[invalid public API base URL]';
    return configured;
  } catch {
    return '[invalid public API base URL]';
  }
}

function clearDashboardDemoStorage(storage: Storage): number {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (
      key?.startsWith(DASHBOARD_STORAGE_PREFIX) &&
      key !== SETTINGS_STORAGE_KEY
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
  return keysToRemove.length;
}

export function SettingsPage() {
  const { refreshIntervalMs, timeZone, theme, updateSettings } =
    useDashboardSettings();
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [clearStatus, setClearStatus] = useState('');
  const clearTriggerRef = useRef<HTMLButtonElement>(null);
  const confirmClearRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isConfirmingClear) confirmClearRef.current?.focus();
  }, [isConfirmingClear]);

  const closeConfirmation = () => {
    setIsConfirmingClear(false);
    window.requestAnimationFrame(() => clearTriggerRef.current?.focus());
  };

  const clearLocalDemoState = () => {
    try {
      const removedCount =
        clearDashboardDemoStorage(window.localStorage) +
        clearDashboardDemoStorage(window.sessionStorage);
      setClearStatus(
        removedCount > 0
          ? 'Local demo state cleared from this browser. Dashboard settings were kept.'
          : 'No local demo state was stored in this browser.',
      );
    } catch {
      setClearStatus(
        "Local demo state could not be cleared. Check this browser's storage permissions.",
      );
    }

    closeConfirmation();
  };

  return (
    <main className={styles.settingsPage}>
      <div className={styles.settingsShell}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>Dashboard controls</p>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageDescription}>
            Tune presentation and refresh behavior. Changes are saved automatically
            on this device.
          </p>
        </header>

        <div className={styles.settingsGrid}>
          <div className={styles.settingsColumn}>
            <section className={styles.panel} aria-labelledby="connection-heading">
              <div className={styles.panelHeader}>
                <span className={styles.panelIcon} aria-hidden="true">
                  <Database size={20} />
                </span>
                <div>
                  <h2 id="connection-heading" className={styles.panelTitle}>
                    Public data configuration
                  </h2>
                  <p className={styles.panelDescription}>
                    Build-time values are visible for diagnostics and cannot be edited here.
                  </p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span>Data mode</span>
                  <input
                    className={styles.readOnlyInput}
                    value={getPublicDataMode()}
                    readOnly
                    aria-describedby="data-mode-help"
                  />
                  <small id="data-mode-help" className={styles.helpText}>
                    mock uses local demo data; api uses the configured backend.
                  </small>
                </label>

                <label className={styles.field}>
                  <span>API base URL</span>
                  <input
                    className={styles.readOnlyInput}
                    value={getPublicApiBaseUrl()}
                    readOnly
                    aria-describedby="api-url-help"
                  />
                  <small id="api-url-help" className={styles.helpText}>
                    This public URL is supplied when the dashboard is built.
                  </small>
                </label>
              </div>
            </section>

            <section className={styles.panel} aria-labelledby="preferences-heading">
              <div className={styles.panelHeader}>
                <span className={styles.panelIcon} aria-hidden="true">
                  <SlidersHorizontal size={20} />
                </span>
                <div>
                  <h2 id="preferences-heading" className={styles.panelTitle}>
                    Preferences
                  </h2>
                  <p className={styles.panelDescription}>
                    Apply these choices across every dashboard route.
                  </p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span>Refresh interval</span>
                  <select
                    className={styles.select}
                    value={refreshIntervalMs}
                    onChange={(event) =>
                      updateSettings({ refreshIntervalMs: Number(event.currentTarget.value) })
                    }
                    aria-describedby="refresh-help"
                  >
                    {refreshOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small id="refresh-help" className={styles.helpText}>
                    Controls scheduled background refreshes.
                  </small>
                </label>

                <label className={styles.field}>
                  <span>Timezone</span>
                  <select
                    className={styles.select}
                    value={timeZone}
                    onChange={(event) =>
                      updateSettings({
                        timeZone: event.currentTarget.value as DashboardTimeZone,
                      })
                    }
                  >
                    {timeZoneOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Theme</span>
                  <select
                    className={styles.select}
                    value={theme}
                    onChange={(event) =>
                      updateSettings({ theme: event.currentTarget.value as ThemeMode })
                    }
                  >
                    {themeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.infoNote} role="note">
                <RefreshCw size={18} aria-hidden="true" />
                <p>
                  A replacement refresh aborts any request still in flight before it starts,
                  preventing stale responses from landing out of order. Interval changes apply
                  to the next refresh cycle.
                </p>
              </div>
            </section>
          </div>

          <aside className={styles.settingsColumn} aria-label="Privacy and local data">
            <section className={styles.panel} aria-labelledby="privacy-heading">
              <div className={styles.panelHeader}>
                <span className={styles.panelIcon} aria-hidden="true">
                  <ShieldAlert size={20} />
                </span>
                <div>
                  <h2 id="privacy-heading" className={styles.panelTitle}>
                    Public configuration only
                  </h2>
                  <p className={styles.panelDescription}>
                    Tokens, passwords, private keys, and API keys are never accepted or stored
                    by this page.
                  </p>
                </div>
              </div>
              <ul className={styles.privacyList}>
                <li>Only the two public Vite settings above are displayed.</li>
                <li>User preferences stay in this browser.</li>
                <li>Backend secrets belong on the server, outside the dashboard bundle.</li>
              </ul>
            </section>

            <section className={styles.dangerPanel} aria-labelledby="local-state-heading">
              <div className={styles.dangerHeader}>
                <div>
                  <h2 id="local-state-heading" className={styles.panelTitle}>
                    Local demo state
                  </h2>
                  <p className={styles.panelDescription}>
                    Remove cached dashboard demo data from this browser. Your display settings
                    remain intact.
                  </p>
                </div>
              </div>

              {!isConfirmingClear ? (
                <button
                  ref={clearTriggerRef}
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    setClearStatus('');
                    setIsConfirmingClear(true);
                  }}
                >
                  Clear local demo state
                </button>
              ) : (
                <div
                  className={styles.confirmation}
                  role="group"
                  aria-labelledby="clear-confirmation-heading"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      closeConfirmation();
                    }
                  }}
                >
                  <p id="clear-confirmation-heading" className={styles.confirmationTitle}>
                    Clear demo state on this device?
                  </p>
                  <p>This cannot be undone. Dashboard preferences will be preserved.</p>
                  <div className={styles.confirmationActions}>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={closeConfirmation}
                    >
                      Cancel
                    </button>
                    <button
                      ref={confirmClearRef}
                      className={styles.dangerButton}
                      type="button"
                      onClick={clearLocalDemoState}
                    >
                      Yes, clear demo state
                    </button>
                  </div>
                </div>
              )}

              <p className={styles.statusText} role="status" aria-live="polite">
                {clearStatus}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default SettingsPage;
