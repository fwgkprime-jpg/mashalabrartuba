import { ShieldCheck, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  DetailSurface,
  PageFrame,
  Stat,
  StatGrid,
} from "../components/layout/PageFrame";
import { PageState } from "../components/ui/PageState";
import { StatusBadge } from "../components/ui/StatusBadge";
import type {
  MonkeyCurrentResponse,
  MonkeyRunDetailResponse,
  MonkeyRunsResponse,
} from "../domain/dashboardContracts";
import {
  statusForPublication,
  statusForRun,
  type StatusCode,
} from "../domain/statusRegistry";
import {
  useMonkeyCurrentQuery,
  useMonkeyRunQuery,
  useMonkeyRunsQuery,
} from "../hooks/useDashboardQueries";
import {
  formatCompact,
  formatCurrency,
  formatDateTime,
  formatPercent,
} from "../lib/format";
import styles from "./CorePages.module.css";

const PIPELINE_STAGES = [
  "PREFLIGHT",
  "FORTNITE",
  "GAMMA",
  "DOTA",
  "MONKEY_ASSEMBLY",
  "WALL_STREET",
  "RELEASE",
  "EVALUATION",
  "FINALIZE",
] as const satisfies readonly (keyof MonkeyCurrentResponse["run_manifest"]["stages"])[];

type AssetKey = "BTC" | "ETH";
type AssetResult = MonkeyCurrentResponse["result"]["assets"][AssetKey];

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function formatRange(range: readonly [number, number]): string {
  return `${formatCurrency(range[0])} - ${formatCurrency(range[1])}`;
}

function stageStatus(status: string): StatusCode {
  if (status === "PENDING") return "PENDING";
  if (status === "RUNNING") return "RUNNING";
  if (status === "COMPLETE") return "COMPLETE";
  if (status === "FAILED") return "FAILED";
  if (status === "SKIPPED_FAIL_CLOSED") return "WITHHELD";
  return "UNKNOWN";
}

function wallStreetStatus(status: string): StatusCode {
  if (status === "OVERLAY_ACCEPTED") return "ACTIVE";
  if (status === "OVERLAY_WARNING") return "DEGRADED";
  if (status === "OVERLAY_WITHHELD") return "WITHHELD";
  if (status === "REVIEW_UNAVAILABLE") return "UNAVAILABLE";
  return "UNKNOWN";
}

function dotaStatus(result: AssetResult): StatusCode {
  if (result.effective_publication === "FORTNITE_ONLY") return "WITHHELD";
  if ("dota_overlay" in result && result.dota_overlay) {
    return result.dota_overlay.effective ? "ACTIVE" : "DEGRADED";
  }
  return "UNAVAILABLE";
}

function dataModeLabel(
  data: MonkeyCurrentResponse | MonkeyRunsResponse | MonkeyRunDetailResponse,
): string | null {
  return data.meta.data_mode === "mock" ? data.meta.demo_label : null;
}

function DemoLabel({ label }: { label: string }) {
  return <span className={styles.demoLabel}>{label}</span>;
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button className={styles.secondaryButton} type="button" onClick={onRetry}>
      Retry request
    </button>
  );
}

function AdvisoryNotice({
  result,
}: {
  result: MonkeyCurrentResponse["result"];
}) {
  return (
    <div className={styles.advisoryNotice} role="note">
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>Advisory only - no trading execution</strong>
        <p>
          MONKEY reports{" "}
          <code>advisory_only = {String(result.advisory_only)}</code> and{" "}
          <code>trading_actions = {result.trading_actions}</code>. This
          interface cannot place or route orders.
        </p>
      </div>
    </div>
  );
}

function AssetForecast({
  asset,
  data,
}: {
  asset: AssetKey;
  data: MonkeyCurrentResponse;
}) {
  const context = data.result.fortnite.contexts[asset];
  const result = data.result.assets[asset];
  const publication =
    asset === "BTC" ? data.btc_publication : data.eth_publication;
  const detail =
    "status_message" in result
      ? result.status_message
      : result.reason_codes.join(", ") || "Fail-closed publication";
  const dotaDetail =
    "dota_overlay" in result && result.dota_overlay
      ? `${result.dota_overlay.status} / ${result.dota_overlay.relation_to_fortnite}`
      : "No DOTA overlay published";

  return (
    <article className={styles.forecastCard}>
      <header className={styles.cardHeader}>
        <div>
          <span>FORTNITE final forecast</span>
          <h3>{asset}</h3>
        </div>
        <StatusBadge status={statusForPublication(publication)} />
      </header>

      <StatGrid>
        <Stat label="P80 range" value={formatRange(context.p80)} />
        <Stat label="P90 range" value={formatRange(context.p90)} />
        <Stat
          label="Publication"
          value={humanize(publication)}
          detail={humanize(result.effective_publication)}
        />
        <Stat
          label="Forecast closes"
          value={formatDateTime(context.forecast_window.end_utc)}
        />
      </StatGrid>

      <ul
        className={styles.assetPipeline}
        aria-label={`${asset} publication pipeline`}
      >
        <li>
          <span>
            <strong>FORTNITE</strong>
            <small>
              {context.final_status} / byte identity{" "}
              {data.result.fortnite.byte_identity}
            </small>
          </span>
          <StatusBadge status="ACTIVE" />
        </li>
        <li>
          <span>
            <strong>DOTA</strong>
            <small>{dotaDetail}</small>
          </span>
          <StatusBadge status={dotaStatus(result)} />
        </li>
        <li>
          <span>
            <strong>WALL STREET</strong>
            <small>
              {humanize(result.wall_street_status)} /{" "}
              {humanize(result.system_state)}
            </small>
          </span>
          <StatusBadge status={wallStreetStatus(result.wall_street_status)} />
        </li>
      </ul>

      <p className={styles.cardMessage}>{detail}</p>
      {"warning_block" in result && result.warning_block && (
        <div className={styles.warningBlock} role="note">
          <strong>{result.warning_block.severity}</strong>
          <span>{result.warning_block.message}</span>
        </div>
      )}
    </article>
  );
}

function CurrentRun({ data }: { data: MonkeyCurrentResponse }) {
  const manifest = data.run_manifest;
  return (
    <div className={styles.currentRun}>
      <StatGrid>
        <Stat label="Run ID" value={manifest.run_id} detail={manifest.mode} />
        <Stat
          label="Run status"
          value={<StatusBadge status={statusForRun(manifest.status)} />}
          detail={humanize(manifest.status)}
        />
        <Stat label="Current stage" value={humanize(data.current_stage)} />
        <Stat
          label="Progress"
          value={formatPercent(data.progress_percent)}
          detail={`Updated ${formatDateTime(manifest.updated_utc)}`}
        />
        <Stat
          label="Joint publication"
          value={humanize(data.result.effective_publication)}
        />
        <Stat label="Last run" value={formatDateTime(data.last_run_utc)} />
      </StatGrid>

      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Current MONKEY run progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={data.progress_percent}
      >
        <span style={{ width: `${data.progress_percent}%` }} />
      </div>

      <AdvisoryNotice result={data.result} />

      <section
        className={styles.contentSection}
        aria-labelledby="forecast-heading"
      >
        <header className={styles.sectionHeader}>
          <div>
            <span>Authoritative FORTNITE context</span>
            <h3 id="forecast-heading">BTC and ETH forecast ranges</h3>
          </div>
          <span
            className={styles.hashSummary}
            title={data.result.fortnite.sha256}
          >
            {formatCompact(data.result.fortnite.byte_length)} bytes
          </span>
        </header>
        <div className={styles.forecastGrid}>
          <AssetForecast asset="BTC" data={data} />
          <AssetForecast asset="ETH" data={data} />
        </div>
      </section>

      <section
        className={styles.contentSection}
        aria-labelledby="pipeline-heading"
      >
        <header className={styles.sectionHeader}>
          <div>
            <span>Immutable run manifest</span>
            <h3 id="pipeline-heading">Pipeline stages</h3>
          </div>
          <span>{PIPELINE_STAGES.length} canonical stages</span>
        </header>
        <ol className={styles.stageList}>
          {PIPELINE_STAGES.map((stage) => {
            const entry = manifest.stages[stage];
            return (
              <li
                key={stage}
                className={
                  stage === data.current_stage ? styles.currentStage : undefined
                }
              >
                <span className={styles.stageIndex} aria-hidden="true">
                  {String(PIPELINE_STAGES.indexOf(stage) + 1).padStart(2, "0")}
                </span>
                <span className={styles.stageCopy}>
                  <strong>{humanize(stage)}</strong>
                  <small>
                    {entry.finished_utc
                      ? `Finished ${formatDateTime(entry.finished_utc)}`
                      : entry.started_utc
                        ? `Started ${formatDateTime(entry.started_utc)}`
                        : "Not started"}
                  </small>
                  {entry.reason_codes.length > 0 && (
                    <small>{entry.reason_codes.join(" / ")}</small>
                  )}
                </span>
                <StatusBadge
                  status={stageStatus(entry.status)}
                  pulse={entry.status === "RUNNING"}
                />
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

interface RunsListProps {
  response: MonkeyRunsResponse | undefined;
  loading: boolean;
  failed: boolean;
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
  onRetry: () => void;
}

function RunsList({
  response,
  loading,
  failed,
  selectedRunId,
  onSelect,
  onRetry,
}: RunsListProps) {
  return (
    <section className={styles.contentSection} aria-labelledby="runs-heading">
      <header className={styles.sectionHeader}>
        <div>
          <span>Manual inspection</span>
          <h3 id="runs-heading">Run archive</h3>
        </div>
        {response && <PanelMeta response={response} />}
      </header>

      {loading && !response ? (
        <PageState kind="loading" title="Loading MONKEY runs" />
      ) : failed && !response ? (
        <PageState
          kind="error"
          title="Run archive unavailable"
          action={<RetryButton onRetry={onRetry} />}
        />
      ) : !response || response.runs.length === 0 ? (
        <PageState
          kind="empty"
          title="No MONKEY runs"
          message="No completed or active run summaries were returned."
        />
      ) : (
        <>
          {failed && (
            <p className={styles.refreshNotice}>
              Refresh failed; showing the last available run archive.
            </p>
          )}
          <ul className={styles.runList}>
            {response.runs.map((run) => (
              <li key={run.run_id}>
                <button
                  type="button"
                  className={
                    run.run_id === selectedRunId
                      ? styles.selectedRow
                      : undefined
                  }
                  onClick={() => onSelect(run.run_id)}
                  aria-pressed={run.run_id === selectedRunId}
                  aria-controls="monkey-run-drawer"
                >
                  <span className={styles.runIdentity}>
                    <code>{run.run_id}</code>
                    <small>
                      {formatDateTime(run.created_utc)} / {run.mode}
                    </small>
                  </span>
                  <span className={styles.runProgress}>
                    <strong>{humanize(run.current_stage)}</strong>
                    <small>
                      {formatPercent(run.progress_percent)} /{" "}
                      {humanize(run.publication)}
                    </small>
                  </span>
                  <StatusBadge status={statusForRun(run.status)} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function PanelMeta({ response }: { response: MonkeyRunsResponse }) {
  return (
    <span className={styles.panelMeta}>
      {response.meta.stale && <StatusBadge status="STALE" />}
      {dataModeLabel(response) && (
        <DemoLabel label={dataModeLabel(response)!} />
      )}
    </span>
  );
}

function RunDetailContent({ data }: { data: MonkeyRunDetailResponse }) {
  const manifest = data.run_manifest;
  return (
    <>
      <div className={styles.drawerCues}>
        <StatusBadge status={statusForRun(manifest.status)} />
        {data.meta.stale && <StatusBadge status="STALE" />}
        {dataModeLabel(data) && <DemoLabel label={dataModeLabel(data)!} />}
      </div>

      <StatGrid>
        <Stat label="Mode" value={manifest.mode} />
        <Stat label="Publication" value={humanize(manifest.publication)} />
        <Stat label="Created" value={formatDateTime(manifest.created_utc)} />
        <Stat label="Updated" value={formatDateTime(manifest.updated_utc)} />
        <Stat
          label="Trading actions"
          value={manifest.counters.trading_actions}
          detail="Execution is disabled"
        />
        <Stat label="Checkpoints" value={data.checkpoints.length} />
      </StatGrid>

      {manifest.last_error && (
        <div className={styles.errorNotice} role="alert">
          <strong>{manifest.last_error.code}</strong>
          <span>
            {manifest.last_error.stage}: {manifest.last_error.message}
          </span>
          <time dateTime={manifest.last_error.at_utc}>
            {formatDateTime(manifest.last_error.at_utc)}
          </time>
        </div>
      )}

      <section className={styles.drawerSection}>
        <h3>Public result</h3>
        {data.result ? (
          <div className={styles.drawerNotice}>
            <strong>{humanize(data.result.effective_publication)}</strong>
            <span>
              Advisory only / trading_actions = {data.result.trading_actions}
            </span>
          </div>
        ) : (
          <PageState
            kind="empty"
            title="No public result"
            message="This run did not produce a public MONKEY result."
          />
        )}
      </section>

      <section className={styles.drawerSection}>
        <h3>Publication decisions</h3>
        {data.publication_decisions ? (
          <div className={styles.decisionList}>
            {(["BTC", "ETH"] as const).map((asset) => {
              const decision = data.publication_decisions![asset];
              return (
                <article key={asset}>
                  <header>
                    <strong>{asset}</strong>
                    <StatusBadge
                      status={statusForPublication(
                        decision.effective_publication,
                      )}
                    />
                  </header>
                  <p>
                    {humanize(decision.wall_street_status)} /{" "}
                    {humanize(decision.system_state)}
                  </p>
                  {decision.reason_codes.length > 0 && (
                    <small>{decision.reason_codes.join(" / ")}</small>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.mutedCopy}>
            No per-asset publication decisions were returned.
          </p>
        )}
      </section>

      <section className={styles.drawerSection}>
        <h3>Checkpoints</h3>
        {data.checkpoints.length === 0 ? (
          <p className={styles.mutedCopy}>
            No checkpoint metadata was returned.
          </p>
        ) : (
          <ol className={styles.checkpointList}>
            {data.checkpoints.map((checkpoint) => (
              <li key={checkpoint.checkpoint_sha256}>
                <span>{checkpoint.sequence}</span>
                <span>
                  <strong>{humanize(checkpoint.stage)}</strong>
                  <small>{formatDateTime(checkpoint.completed_utc)}</small>
                </span>
                <StatusBadge
                  status={
                    checkpoint.status === "COMPLETE" ? "COMPLETE" : "FAILED"
                  }
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function RunDrawer({ runId, onClose }: { runId: string; onClose: () => void }) {
  const query = useMonkeyRunQuery(runId);
  return (
    <div id="monkey-run-drawer" className={styles.drawerContent}>
      <header className={styles.drawerHeader}>
        <div>
          <span>Selected run</span>
          <h2>{runId}</h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close run details"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      {query.isLoading && !query.data ? (
        <PageState kind="loading" title="Loading run details" />
      ) : query.isError && !query.data ? (
        <PageState
          kind="error"
          title="Run details unavailable"
          action={<RetryButton onRetry={() => void query.refetch()} />}
        />
      ) : query.data ? (
        <>
          {query.isError && (
            <p className={styles.refreshNotice}>
              Detail refresh failed; showing cached data.
            </p>
          )}
          <RunDetailContent data={query.data} />
        </>
      ) : (
        <PageState kind="empty" title="Run details missing" />
      )}
    </div>
  );
}

export function MonkeyPage() {
  const currentQuery = useMonkeyCurrentQuery();
  const runsQuery = useMonkeyRunsQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRunId = searchParams.get("run");

  const selectRun = (runId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("run", runId);
    setSearchParams(next);
  };

  const closeRun = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("run");
    setSearchParams(next);
  };

  const current = currentQuery.data;
  const headerStatus = current ? (
    <span className={styles.badgeRow}>
      <StatusBadge
        status={statusForRun(current.run_manifest.status)}
        pulse={current.run_manifest.status === "RUNNING"}
      />
      {current.meta.stale && <StatusBadge status="STALE" />}
      {dataModeLabel(current) && <DemoLabel label={dataModeLabel(current)!} />}
    </span>
  ) : undefined;

  return (
    <PageFrame
      eyebrow="MONKEY pipeline"
      title="MONKEY"
      description="Read-only FORTNITE forecasts, DOTA context, WALL STREET publication review, and immutable run telemetry. No trading actions are available."
      accent="cyan"
      status={headerStatus}
    >
      {current?.meta.stale && (
        <p className={styles.staleBanner} role="status">
          This MONKEY snapshot is stale. Values remain visible for inspection
          and are not presented as current production output.
        </p>
      )}

      <DetailSurface
        eyebrow="Current and historical telemetry"
        title="MONKEY operations"
        meta={
          current && (
            <time dateTime={current.meta.observed_at_utc}>
              {formatDateTime(current.meta.observed_at_utc)}
            </time>
          )
        }
        aside={
          selectedRunId ? (
            <RunDrawer runId={selectedRunId} onClose={closeRun} />
          ) : undefined
        }
      >
        {currentQuery.isLoading && !current ? (
          <PageState kind="loading" title="Loading current MONKEY run" />
        ) : currentQuery.isError && !current ? (
          <PageState
            kind="error"
            title="Current MONKEY run unavailable"
            action={<RetryButton onRetry={() => void currentQuery.refetch()} />}
          />
        ) : current ? (
          <>
            {currentQuery.isError && (
              <p className={styles.refreshNotice}>
                Current run refresh failed; showing cached data.
              </p>
            )}
            <CurrentRun data={current} />
          </>
        ) : (
          <PageState kind="empty" title="No current MONKEY run" />
        )}

        <RunsList
          response={runsQuery.data}
          loading={runsQuery.isLoading}
          failed={runsQuery.isError}
          selectedRunId={selectedRunId}
          onSelect={selectRun}
          onRetry={() => void runsQuery.refetch()}
        />
      </DetailSurface>
    </PageFrame>
  );
}

export default MonkeyPage;
