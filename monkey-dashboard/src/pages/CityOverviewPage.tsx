import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CityScene, type CityStatusTone, type SevenCityModules } from '../components/city/CityScene';
import {
  ActivityFeedPanel,
  ConnectivityPanel,
  PerformancePanel,
  ResourcesPanel,
  SystemStatusPanel,
  type ActivitySeverity,
  type PerformancePeriod,
} from '../components/dashboard/TelemetryPanels';
import { Button } from '../components/ui/Button';
import { PageState } from '../components/ui/PageState';
import {
  normalizeStatus,
  statusForReliability,
  statusForRun,
  type StatusCode,
} from '../domain/statusRegistry';
import { useClock } from '../hooks/useClock';
import {
  useActivityQuery,
  useDiaryQuery,
  useFixCodeQuery,
  useMonkeyCurrentQuery,
  useNotesQuery,
  useOrderHistoryQuery,
  useRecommendationsQuery,
  useStructureQuery,
  useSystemResourcesQuery,
  useSystemStatusQuery,
} from '../hooks/useDashboardQueries';
import { formatRelativeTime } from '../lib/format';
import styles from './CityOverviewPage.module.css';

function toneForStatus(status: StatusCode): CityStatusTone {
  if (['ONLINE', 'ACTIVE', 'COMPLETE'].includes(status)) return 'positive';
  if (['DEGRADED', 'STALE', 'WITHHELD', 'FORTNITE_ONLY', 'PENDING'].includes(status)) return 'warning';
  if (['FAILED', 'OFFLINE', 'UNAVAILABLE'].includes(status)) return 'danger';
  return 'muted';
}

function worstStatus(statuses: readonly StatusCode[]): StatusCode {
  const order: StatusCode[] = ['FAILED', 'UNAVAILABLE', 'OFFLINE', 'DEGRADED', 'STALE', 'PENDING', 'WITHHELD', 'FORTNITE_ONLY', 'RUNNING', 'ACTIVE', 'COMPLETE', 'ONLINE', 'MOCK', 'PAUSED', 'UNKNOWN'];
  return order.find((candidate) => statuses.includes(candidate)) ?? 'UNKNOWN';
}

function periodHours(period: PerformancePeriod): number {
  if (period === '7D') return 7 * 24;
  if (period === '30D') return 30 * 24;
  return 24;
}

export function CityOverviewPage() {
  const [period, setPeriod] = useState<PerformancePeriod>('24H');
  const clock = useClock();
  const currentHour = Math.floor(clock.getTime() / 3_600_000);
  const sinceUtc = useMemo(() => new Date((currentHour - periodHours(period)) * 3_600_000).toISOString(), [currentHour, period]);
  const system = useSystemStatusQuery();
  const resources = useSystemResourcesQuery();
  const activity = useActivityQuery({ limit: 20 });
  const monkey = useMonkeyCurrentQuery();
  const structure = useStructureQuery();
  const history = useOrderHistoryQuery({ since_utc: sinceUtc });
  const recommendations = useRecommendationsQuery();
  const notes = useNotesQuery();
  const fixes = useFixCodeQuery();
  const diary = useDiaryQuery();

  const allQueries = [system, resources, activity, monkey, structure, history, recommendations, notes, fixes, diary];
  const hasError = allQueries.some((query) => query.isError);
  const isMock = allQueries.some((query) => query.data?.meta.data_mode === 'mock');
  const isStale = allQueries.some((query) => query.isStale || query.data?.meta.stale);

  const structureStatus = structure.data
    ? worstStatus(Object.values(structure.data.assets).map((asset) => statusForReliability(asset.data_reliability)))
    : structure.isError ? 'UNAVAILABLE' : 'PENDING';
  const recommendationStatus = recommendations.data?.items.some((item) => item.status === 'NEW') ? 'PENDING' : recommendations.data ? 'COMPLETE' : 'PENDING';
  const notesStatus = notes.data?.items.some((item) => item.status === 'NEW') ? 'PENDING' : notes.data ? 'COMPLETE' : 'PENDING';
  const fixesStatus = fixes.data?.items.some((item) => item.status === 'NEW') ? 'PENDING' : fixes.data ? 'COMPLETE' : 'PENDING';
  const monkeyStatus = monkey.data ? statusForRun(monkey.data.run_manifest.status) : monkey.isError ? 'UNAVAILABLE' : 'PENDING';

  const modules: SevenCityModules = [
    { id: 'monkey', title: 'MONKEY', subtitle: 'Forecast pipeline', to: '/monkey', status: monkeyStatus, statusTone: toneForStatus(monkeyStatus), accent: 'magenta', meta: monkey.data ? `${monkey.data.btc_publication} · ${monkey.data.eth_publication}` : 'Synchronizing' },
    { id: 'structure', title: 'STRUCTURE', subtitle: 'Market & gamma', to: '/structure', status: structureStatus, statusTone: toneForStatus(structureStatus), accent: 'violet', meta: structure.data ? 'BTC · ETH evidence' : 'Awaiting projection' },
    { id: 'order-history', title: 'ORDER HISTORY', subtitle: 'Hourly origins', to: '/order-history', status: history.data?.origins.length ? 'ACTIVE' : 'PENDING', statusTone: history.data?.origins.length ? 'positive' : 'muted', accent: 'cyan', meta: `${history.data?.origins.length ?? 0} in ${period}` },
    { id: 'crab-recommendations', title: 'CRAB RECOMMENDATIONS', subtitle: 'OpenClaw proposals', to: '/crab-recommendations', status: recommendationStatus, statusTone: toneForStatus(recommendationStatus), accent: 'blue', meta: `${recommendations.data?.items.filter((item) => item.status === 'NEW').length ?? 0} awaiting review` },
    { id: 'crab-notes', title: 'CRAB NOTES', subtitle: 'Manual review notes', to: '/crab-notes', status: notesStatus, statusTone: toneForStatus(notesStatus), accent: 'violet', meta: `${notes.data?.items.length ?? 0} notes` },
    { id: 'fix-code', title: 'FIX CODE', subtitle: 'Repair proposals', to: '/fix-code', status: fixesStatus, statusTone: toneForStatus(fixesStatus), accent: 'cyan', meta: 'Auto-apply off' },
    { id: 'diary', title: 'ДНЕВНИК', subtitle: 'OpenClaw diary', to: '/diary', status: diary.data?.entries.length ? 'ACTIVE' : 'PENDING', statusTone: diary.data?.entries.length ? 'positive' : 'muted', accent: 'orange', meta: `${diary.data?.entries.length ?? 0} entries` },
  ];

  const origins = history.data?.origins ?? [];
  const evaluated = origins.filter((origin) => origin.outcome_status !== 'PENDING');
  const inside = origins.filter((origin) => origin.outcome_status === 'INSIDE').length;
  const outside = origins.filter((origin) => origin.outcome_status === 'OUTSIDE').length;
  const samples = resources.data?.samples ?? [];
  const currentResources = resources.data?.current;

  const refreshAll = () => {
    for (const query of allQueries) void query.refetch();
  };

  return (
    <div className={styles.overview}>
      <header className={styles.heroHeader}>
        <div><span className={styles.eyebrow}>OpenClaw VPS · System observatory</span><h1>City Overview</h1><p>A read-only command city for MONKEY forecasts, evidence, audit activity, and human review.</p></div>
        <div className={styles.heroActions}><span className={styles.demoFlag}>{isMock ? 'DEMO / MOCK DATA' : 'API DATA'}{isStale ? ' · STALE' : ''}</span><Button variant="ghost" icon={<RefreshCw />} onClick={refreshAll}>Refresh city</Button></div>
      </header>

      {hasError && <div className={styles.partialError} role="alert"><AlertTriangle aria-hidden="true" /><span>One or more districts could not refresh. Available cached districts remain interactive.</span><Button variant="ghost" onClick={refreshAll}>Retry</Button></div>}

      <div className={styles.cityLayout}>
        <aside className={styles.leftRail} aria-label="System telemetry">
          <SystemStatusPanel
            uptimeSeconds={system.data?.uptime_seconds}
            coreHealthStatus={system.data?.core_health}
            dataSyncStatus={system.data?.data_sync}
            lastUpdatedAt={system.data?.last_update_utc}
            systemStatus={system.data?.connectivity ?? (system.isError ? 'UNAVAILABLE' : undefined)}
            monkeyStatus={system.data?.monkey_state}
            openClawStatus={system.data?.openclaw_state}
            isMock={system.data?.meta.data_mode === 'mock'}
            isStale={system.isStale || system.data?.meta.stale}
          />
          <PerformancePanel
            period={period}
            onPeriodChange={setPeriod}
            trendValues={origins.slice().reverse().map((origin) => origin.outcome_status === 'INSIDE' ? 1 : origin.outcome_status === 'OUTSIDE' ? 0 : 0.5)}
            forecastCount={origins.length}
            insideCount={inside}
            outsideCount={outside}
            pendingCount={origins.filter((origin) => origin.outcome_status === 'PENDING').length}
            coveragePercent={origins.length ? (evaluated.length / origins.length) * 100 : 0}
            dotaPublished={origins.filter((origin) => origin.effective_publication !== 'FORTNITE_ONLY').length}
            dotaWithheld={origins.filter((origin) => origin.effective_publication === 'FORTNITE_ONLY').length}
            isMock={history.data?.meta.data_mode === 'mock'}
            isStale={history.isStale || history.data?.meta.stale}
          />
        </aside>

        <section className={styles.cityStage} aria-label="Interactive module city">
          {monkey.isLoading && !monkey.data ? <PageState kind="loading" message="Powering the MONKEY city core." /> : (
            <CityScene
              core={{
                to: '/monkey',
                status: monkeyStatus,
                statusTone: toneForStatus(monkeyStatus),
                runId: monkey.data?.run_manifest.run_id ?? 'Awaiting run',
                stage: monkey.data?.current_stage ?? 'PREFLIGHT',
                progress: monkey.data?.progress_percent ?? 0,
                lastRun: monkey.data?.last_run_utc ? formatRelativeTime(monkey.data.last_run_utc) : 'Unavailable',
                subtitle: monkey.data ? `BTC ${monkey.data.btc_publication} · ETH ${monkey.data.eth_publication}` : 'Central forecast hub',
              }}
              modules={modules}
            />
          )}
        </section>

        <aside className={styles.rightRail} aria-label="Connectivity and activity">
          <ConnectivityPanel
            utcTimestamp={clock.toISOString()}
            localTimeZone="Europe/Kyiv"
            localTimeLabel="Kyiv time"
            vpsRegion={system.data?.vps_region}
            lastHeartbeatAt={system.data?.last_heartbeat_utc}
            connected={system.data ? normalizeStatus(system.data.connectivity) === 'ONLINE' : system.isError ? false : null}
            isMock={system.data?.meta.data_mode === 'mock'}
            isStale={system.isStale || system.data?.meta.stale}
          />
          <ActivityFeedPanel
            items={(activity.data?.items ?? []).map((event) => ({ id: event.id, source: event.stage ?? event.kind, message: event.message, timestamp: event.occurred_at_utc, severity: event.severity as ActivitySeverity }))}
            maxItems={8}
            isMock={activity.data?.meta.data_mode === 'mock'}
            isStale={activity.isStale || activity.data?.meta.stale}
          />
        </aside>

        <ResourcesPanel
          className={styles.resources}
          cpuPercent={currentResources?.cpu_percent}
          cpuTrend={samples.map((sample) => sample.cpu_percent)}
          memoryPercent={currentResources?.memory_percent}
          memoryTrend={samples.map((sample) => sample.memory_percent)}
          diskPercent={currentResources?.disk_percent}
          diskTrend={samples.map((sample) => sample.disk_percent)}
          networkPercent={resources.data?.meta.data_mode === 'mock' && currentResources ? Math.min(100, (currentResources.network_rx_kbps + currentResources.network_tx_kbps) / 20) : null}
          networkTrend={resources.data?.meta.data_mode === 'mock' ? samples.map((sample) => Math.min(100, (sample.network_rx_kbps + sample.network_tx_kbps) / 20)) : []}
          isMock={resources.data?.meta.data_mode === 'mock'}
          isStale={resources.isStale || resources.data?.meta.stale}
        />
      </div>
    </div>
  );
}

export default CityOverviewPage;
