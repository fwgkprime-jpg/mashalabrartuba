import type { StatusCode } from "../../domain/statusRegistry";
import {
  formatCompact,
  formatDateTime,
  formatDuration,
  formatPercent,
  formatRelativeTime,
} from "../../lib/format";
import { GlassPanel } from "../ui/GlassPanel";
import { Sparkline } from "../ui/Sparkline";
import { StatusBadge } from "../ui/StatusBadge";
import styles from "./TelemetryPanels.module.css";

type OptionalNumber = number | null | undefined;

export type PerformancePeriod = "24H" | "7D" | "30D";

export type ActivitySeverity = "info" | "success" | "warning" | "error";

export interface SystemStatusPanelProps {
  uptimeSeconds?: number | null;
  coreHealthPercent?: number | null;
  coreHealthStatus?: StatusCode | null;
  dataSyncPercent?: number | null;
  dataSyncStatus?: StatusCode | null;
  lastUpdatedAt?: string | null;
  systemStatus?: StatusCode | null;
  monkeyStatus?: StatusCode | null;
  openClawStatus?: StatusCode | null;
  isMock?: boolean;
  isStale?: boolean;
  className?: string;
}

export interface PerformancePanelProps {
  period: PerformancePeriod;
  onPeriodChange: (period: PerformancePeriod) => void;
  trendValues: readonly number[];
  forecastCount?: number | null;
  insideCount?: number | null;
  outsideCount?: number | null;
  pendingCount?: number | null;
  coveragePercent?: number | null;
  dotaPublished?: number | null;
  dotaWithheld?: number | null;
  isMock?: boolean;
  isStale?: boolean;
  className?: string;
}

export interface ResourcesPanelProps {
  cpuPercent?: number | null;
  cpuTrend?: readonly number[];
  memoryPercent?: number | null;
  memoryTrend?: readonly number[];
  diskPercent?: number | null;
  diskTrend?: readonly number[];
  networkPercent?: number | null;
  networkTrend?: readonly number[];
  isMock?: boolean;
  isStale?: boolean;
  className?: string;
}

export interface ConnectivityPanelProps {
  utcTimestamp?: string | null;
  localTimeZone: string;
  localTimeLabel?: string;
  vpsRegion?: string | null;
  lastHeartbeatAt?: string | null;
  connected?: boolean | null;
  isMock?: boolean;
  isStale?: boolean;
  className?: string;
}

export interface ActivityFeedItem {
  id: string;
  source: string;
  message: string;
  timestamp: string;
  severity: ActivitySeverity;
}

export interface ActivityFeedPanelProps {
  items: readonly ActivityFeedItem[];
  maxItems?: number;
  isMock?: boolean;
  isStale?: boolean;
  className?: string;
}

interface PanelCuesProps {
  status?: StatusCode | null;
  isMock?: boolean;
  isStale?: boolean;
}

function PanelCues({
  status,
  isMock = false,
  isStale = false,
}: PanelCuesProps) {
  if (!status && !isMock && !isStale) return null;

  return (
    <span className={styles.panelCues} role="group" aria-label="Data status">
      {status && (
        <StatusBadge
          status={status}
          pulse={status === "ONLINE" || status === "ACTIVE"}
        />
      )}
      {isStale && status !== "STALE" && <StatusBadge status="STALE" />}
      {isMock && <span className={styles.mockLabel}>DEMO / MOCK DATA</span>}
    </span>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className={styles.emptyState} role="status">
      <span className={styles.emptyGlyph} aria-hidden="true">
        --
      </span>
      <p>{children}</p>
    </div>
  );
}

function isFiniteNumber(value: OptionalNumber): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function displayPercent(value: OptionalNumber, digits = 0): string {
  return isFiniteNumber(value) ? formatPercent(value, digits) : "Unavailable";
}

function displayCount(value: OptionalNumber): string {
  return isFiniteNumber(value) ? formatCompact(value) : "--";
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

interface MeterProps {
  label: string;
  value: OptionalNumber;
  tone?: "cyan" | "purple" | "green" | "orange";
}

function Meter({ label, value, tone = "cyan" }: MeterProps) {
  if (!isFiniteNumber(value))
    return <span className={styles.unavailableBar} aria-hidden="true" />;

  const clampedValue = clampPercent(value);
  return (
    <span
      className={styles.meterTrack}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedValue}
      data-tone={tone}
    >
      <span
        className={styles.meterFill}
        style={{ width: `${clampedValue}%` }}
      />
    </span>
  );
}

export function SystemStatusPanel({
  uptimeSeconds,
  coreHealthPercent,
  coreHealthStatus,
  dataSyncPercent,
  dataSyncStatus,
  lastUpdatedAt,
  systemStatus,
  monkeyStatus,
  openClawStatus,
  isMock = false,
  isStale = false,
  className = "",
}: SystemStatusPanelProps) {
  const hasData =
    isFiniteNumber(uptimeSeconds) ||
    isFiniteNumber(coreHealthPercent) ||
    isFiniteNumber(dataSyncPercent) ||
    Boolean(coreHealthStatus || dataSyncStatus) ||
    Boolean(lastUpdatedAt || systemStatus || monkeyStatus || openClawStatus);

  return (
    <GlassPanel
      className={`${styles.panel} ${styles.systemPanel} ${className}`}
      title="System status"
      action={
        <PanelCues status={systemStatus} isMock={isMock} isStale={isStale} />
      }
      aria-label="System status telemetry"
    >
      {!hasData ? (
        <EmptyState>System telemetry is not available.</EmptyState>
      ) : (
        <div className={styles.panelBody}>
          <dl className={styles.statusMetrics}>
            <div>
              <dt>Uptime</dt>
              <dd>
                {isFiniteNumber(uptimeSeconds) && uptimeSeconds >= 0
                  ? formatDuration(uptimeSeconds)
                  : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Core health</dt>
              <dd>{coreHealthStatus ? <StatusBadge status={coreHealthStatus} /> : displayPercent(coreHealthPercent)}</dd>
              {isFiniteNumber(coreHealthPercent) && <Meter label="Core health" value={coreHealthPercent} tone="green" />}
            </div>
            <div>
              <dt>Data sync</dt>
              <dd>{dataSyncStatus ? <StatusBadge status={dataSyncStatus} /> : displayPercent(dataSyncPercent)}</dd>
              {isFiniteNumber(dataSyncPercent) && <Meter label="Data sync" value={dataSyncPercent} />}
            </div>
            <div>
              <dt>Last update</dt>
              <dd className={isStale ? styles.staleText : undefined}>
                {lastUpdatedAt ? (
                  <time
                    dateTime={lastUpdatedAt}
                    title={formatDateTime(lastUpdatedAt)}
                  >
                    {formatRelativeTime(lastUpdatedAt)}
                  </time>
                ) : (
                  "Unavailable"
                )}
              </dd>
            </div>
          </dl>

          {(monkeyStatus || openClawStatus) && (
            <div className={styles.serviceStatuses} aria-label="Service states">
              {monkeyStatus && (
                <span>
                  <span>MONKEY</span>
                  <StatusBadge status={monkeyStatus} />
                </span>
              )}
              {openClawStatus && (
                <span>
                  <span>OpenClaw</span>
                  <StatusBadge status={openClawStatus} />
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}

const PERFORMANCE_PERIODS: readonly PerformancePeriod[] = ["24H", "7D", "30D"];

interface MetricTileProps {
  label: string;
  value: string;
  tone?: ActivitySeverity | "neutral";
}

function MetricTile({ label, value, tone = "neutral" }: MetricTileProps) {
  return (
    <div className={styles.metricTile} data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function PerformancePanel({
  period,
  onPeriodChange,
  trendValues,
  forecastCount,
  insideCount,
  outsideCount,
  pendingCount,
  coveragePercent,
  dotaPublished,
  dotaWithheld,
  isMock = false,
  isStale = false,
  className = "",
}: PerformancePanelProps) {
  const hasMetrics = [
    forecastCount,
    insideCount,
    outsideCount,
    pendingCount,
    coveragePercent,
    dotaPublished,
    dotaWithheld,
  ].some(isFiniteNumber);
  const hasTrend = trendValues.length >= 2;

  const periodControl = (
    <div
      className={styles.periodControl}
      role="group"
      aria-label="Performance period"
    >
      {PERFORMANCE_PERIODS.map((option) => (
        <button
          type="button"
          key={option}
          className={period === option ? styles.periodActive : undefined}
          aria-pressed={period === option}
          onClick={() => onPeriodChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );

  return (
    <GlassPanel
      className={`${styles.panel} ${styles.performancePanel} ${className}`}
      title="Performance"
      action={periodControl}
      aria-label="Forecast performance telemetry"
    >
      <div className={styles.inlineCues}>
        <PanelCues isMock={isMock} isStale={isStale} />
      </div>
      {!hasMetrics && !hasTrend ? (
        <EmptyState>{`No performance data is available for ${period}.`}</EmptyState>
      ) : (
        <div className={styles.panelBody}>
          <div className={styles.trendChart}>
            {hasTrend ? (
              <Sparkline
                values={trendValues}
                label={`${period} forecast performance trend`}
                tone="cyan"
              />
            ) : (
              <span className={styles.chartEmpty}>Trend unavailable</span>
            )}
          </div>

          <div className={styles.metricGrid}>
            <MetricTile label="Forecasts" value={displayCount(forecastCount)} />
            <MetricTile
              label="Inside"
              value={displayCount(insideCount)}
              tone="success"
            />
            <MetricTile
              label="Outside"
              value={displayCount(outsideCount)}
              tone="error"
            />
            <MetricTile
              label="Pending"
              value={displayCount(pendingCount)}
              tone="warning"
            />
            <MetricTile
              label="Coverage"
              value={displayPercent(coveragePercent, 1)}
              tone="info"
            />
            <MetricTile
              label="DOTA published"
              value={displayCount(dotaPublished)}
              tone="success"
            />
            <MetricTile
              label="DOTA withheld"
              value={displayCount(dotaWithheld)}
              tone="warning"
            />
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

interface ResourceMetricProps {
  label: string;
  shortLabel: string;
  value: OptionalNumber;
  trend: readonly number[];
  tone: "cyan" | "purple" | "green" | "orange";
}

function ResourceMetric({
  label,
  shortLabel,
  value,
  trend,
  tone,
}: ResourceMetricProps) {
  return (
    <article
      className={styles.resourceMetric}
      data-tone={tone}
      aria-label={`${label} utilization`}
    >
      <header>
        <span className={styles.resourceIcon} aria-hidden="true">
          {shortLabel}
        </span>
        <span>
          <small>{label}</small>
          <strong>{displayPercent(value)}</strong>
        </span>
      </header>
      <Meter label={`${label} utilization`} value={value} tone={tone} />
      {trend.length >= 2 ? (
        <Sparkline
          values={trend}
          label={`${label} recent utilization`}
          tone={tone}
        />
      ) : (
        <span className={styles.miniChartEmpty}>No trend</span>
      )}
    </article>
  );
}

export function ResourcesPanel({
  cpuPercent,
  cpuTrend = [],
  memoryPercent,
  memoryTrend = [],
  diskPercent,
  diskTrend = [],
  networkPercent,
  networkTrend = [],
  isMock = false,
  isStale = false,
  className = "",
}: ResourcesPanelProps) {
  const hasData = [cpuPercent, memoryPercent, diskPercent, networkPercent].some(
    isFiniteNumber,
  );
  const hasTrends = [cpuTrend, memoryTrend, diskTrend, networkTrend].some(
    (trend) => trend.length >= 2,
  );

  return (
    <GlassPanel
      className={`${styles.panel} ${styles.resourcesPanel} ${className}`}
      title="System resources"
      action={<PanelCues isMock={isMock} isStale={isStale} />}
      aria-label="System resource telemetry"
    >
      {!hasData && !hasTrends ? (
        <EmptyState>Resource telemetry is not available.</EmptyState>
      ) : (
        <div className={styles.resourceGrid}>
          <ResourceMetric
            label="CPU"
            shortLabel="CPU"
            value={cpuPercent}
            trend={cpuTrend}
            tone="cyan"
          />
          <ResourceMetric
            label="Memory"
            shortLabel="MEM"
            value={memoryPercent}
            trend={memoryTrend}
            tone="purple"
          />
          <ResourceMetric
            label="Disk"
            shortLabel="DSK"
            value={diskPercent}
            trend={diskTrend}
            tone="green"
          />
          <ResourceMetric
            label="Network"
            shortLabel="NET"
            value={networkPercent}
            trend={networkTrend}
            tone="orange"
          />
        </div>
      )}
    </GlassPanel>
  );
}

function ConnectivityRadar({
  connected,
}: {
  connected: boolean | null | undefined;
}) {
  const stateLabel =
    connected === true
      ? "connected"
      : connected === false
        ? "disconnected"
        : "unknown";
  return (
    <svg
      className={styles.radar}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`VPS connectivity radar: ${stateLabel}`}
      data-connected={
        connected === true ? "true" : connected === false ? "false" : "unknown"
      }
    >
      <circle className={styles.radarBackdrop} cx="100" cy="100" r="91" />
      <g className={styles.radarGrid}>
        <circle cx="100" cy="100" r="27" />
        <circle cx="100" cy="100" r="54" />
        <circle cx="100" cy="100" r="81" />
        <path d="M100 10v180M10 100h180M36 36l128 128M164 36 36 164" />
      </g>
      <g className={styles.radarSweep}>
        <path d="M100 100 46 153A76 76 0 0 1 28 122Z" />
        <path d="M100 100 46 153" />
      </g>
      <g className={styles.radarSignals}>
        <circle cx="46" cy="153" r="4" />
        <circle cx="150" cy="48" r="3" />
        <circle cx="166" cy="115" r="3" />
        <circle cx="73" cy="48" r="2.5" />
      </g>
      <circle className={styles.radarCore} cx="100" cy="100" r="5" />
    </svg>
  );
}

export function ConnectivityPanel({
  utcTimestamp,
  localTimeZone,
  localTimeLabel = "Local time",
  vpsRegion,
  lastHeartbeatAt,
  connected,
  isMock = false,
  isStale = false,
  className = "",
}: ConnectivityPanelProps) {
  const status: StatusCode = isStale
    ? "STALE"
    : connected === true
      ? "ONLINE"
      : connected === false
        ? "UNAVAILABLE"
        : "UNKNOWN";
  const hasData = Boolean(
    utcTimestamp ||
    vpsRegion ||
    lastHeartbeatAt ||
    (connected !== null && connected !== undefined),
  );

  return (
    <GlassPanel
      className={`${styles.panel} ${styles.connectivityPanel} ${className}`}
      title="Connectivity"
      action={<PanelCues status={status} isMock={isMock} />}
      aria-label="VPS connectivity telemetry"
    >
      {!hasData ? (
        <EmptyState>Connectivity telemetry is not available.</EmptyState>
      ) : (
        <div className={styles.connectivityBody}>
          <ConnectivityRadar connected={connected} />
          <dl className={styles.connectivityDetails}>
            <div>
              <dt>UTC time</dt>
              <dd>
                {utcTimestamp
                  ? formatDateTime(utcTimestamp, "UTC")
                  : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>{localTimeLabel}</dt>
              <dd>
                {utcTimestamp
                  ? formatDateTime(utcTimestamp, localTimeZone)
                  : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>VPS region</dt>
              <dd>{vpsRegion || "Unavailable"}</dd>
            </div>
            <div>
              <dt>Last heartbeat</dt>
              <dd className={isStale ? styles.staleText : undefined}>
                {lastHeartbeatAt ? (
                  <time
                    dateTime={lastHeartbeatAt}
                    title={formatDateTime(lastHeartbeatAt)}
                  >
                    {formatRelativeTime(lastHeartbeatAt)}
                  </time>
                ) : (
                  "Unavailable"
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </GlassPanel>
  );
}

function normalizeMaxItems(maxItems: number): number {
  return Number.isFinite(maxItems) ? Math.max(0, Math.trunc(maxItems)) : 0;
}

export function ActivityFeedPanel({
  items,
  maxItems = 8,
  isMock = false,
  isStale = false,
  className = "",
}: ActivityFeedPanelProps) {
  const visibleItems = items.slice(0, normalizeMaxItems(maxItems));

  return (
    <GlassPanel
      className={`${styles.panel} ${styles.activityPanel} ${className}`}
      title="Activity feed"
      action={<PanelCues isMock={isMock} isStale={isStale} />}
      aria-label="Recent system activity"
    >
      {visibleItems.length === 0 ? (
        <EmptyState>No activity has been recorded.</EmptyState>
      ) : (
        <ol
          className={styles.activityList}
          aria-live="polite"
          aria-relevant="additions text"
        >
          {visibleItems.map((item) => (
            <li key={item.id} data-severity={item.severity}>
              <span className={styles.severityDot} aria-hidden="true" />
              <span className={styles.activityCopy}>
                <span>
                  <strong>{item.source}</strong>
                  <span className={styles.srOnly}>{item.severity}: </span>
                  {item.message}
                </span>
                <time
                  dateTime={item.timestamp}
                  title={formatDateTime(item.timestamp)}
                >
                  {formatRelativeTime(item.timestamp)}
                </time>
              </span>
            </li>
          ))}
        </ol>
      )}
    </GlassPanel>
  );
}
