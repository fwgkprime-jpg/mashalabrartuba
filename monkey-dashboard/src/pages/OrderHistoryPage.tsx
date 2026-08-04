import { CheckCircle2, Clock3, DatabaseZap, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DetailSurface, PageFrame, Stat, StatGrid } from '../components/layout/PageFrame';
import { Button } from '../components/ui/Button';
import { PageState } from '../components/ui/PageState';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { ForecastHorizon, OrderHistoryOrigin } from '../domain/dashboardContracts';
import type { StatusCode } from '../domain/statusRegistry';
import { useClock } from '../hooks/useClock';
import {
  useOrderHistoryQuery,
  useOrderOriginQuery,
  useSelectOrderOriginMutation,
} from '../hooks/useDashboardQueries';
import { formatCurrency, formatDateTime } from '../lib/format';
import styles from './OperationsPages.module.css';

type AssetFilter = 'ALL' | 'BTC' | 'ETH';
type HorizonFilter = 'ALL' | '12' | '24';

function outcomeStatus(value: OrderHistoryOrigin['outcome_status']): StatusCode {
  if (value === 'INSIDE') return 'COMPLETE';
  if (value === 'OUTSIDE') return 'FAILED';
  return 'PENDING';
}

function remainingLabel(deadline: string, now: number): string {
  const remaining = new Date(deadline).getTime() - now;
  if (remaining <= 0) return 'Selection closed';
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} left`;
}

function ForecastRanges({ origin }: { origin: OrderHistoryOrigin }) {
  return (
    <div className={styles.rangeStack} aria-label="Forecast ranges">
      {([['P80', origin.p80], ['P90', origin.p90]] as const).map(([label, range]) => (
        <div className={styles.rangeLine} key={label}>
          <span>{label}</span><div className={styles.rangeTrack} aria-hidden="true" />
          <div className={styles.rangeValues}><span>{formatCurrency(range[0])}</span><span>{formatCurrency(range[1])}</span></div>
        </div>
      ))}
    </div>
  );
}

export function OrderHistoryPage() {
  const [asset, setAsset] = useState<AssetFilter>('ALL');
  const [horizon, setHorizon] = useState<HorizonFilter>('ALL');
  const [focusedOriginId, setFocusedOriginId] = useState<string | null>(null);
  const now = useClock().getTime();
  const currentHour = Math.floor(now / 3_600_000);
  const sinceUtc = useMemo(() => new Date((currentHour - 24) * 3_600_000).toISOString(), [currentHour]);
  const queryInput = useMemo(
    () => ({
      since_utc: sinceUtc,
      ...(asset === 'ALL' ? {} : { asset }),
      ...(horizon === 'ALL' ? {} : { horizon_hours: Number(horizon) as ForecastHorizon }),
    }),
    [asset, horizon, sinceUtc],
  );
  const history = useOrderHistoryQuery(queryInput);
  const selectedOriginId = focusedOriginId ?? history.data?.origins.find((item) => item.selected_by_user)?.origin_id ?? history.data?.origins[0]?.origin_id ?? null;
  const detail = useOrderOriginQuery(selectedOriginId);
  const selection = useSelectOrderOriginMutation();

  const selectOrigin = (origin: OrderHistoryOrigin) => {
    if (origin.selected_by_user || new Date(origin.selection_deadline_utc).getTime() <= now) return;
    const current = history.data?.origins.find(
      (item) => item.asset === origin.asset && item.horizon_hours === origin.horizon_hours && item.selected_by_user,
    );
    selection.mutate({
      originId: origin.origin_id,
      request: { expected_selected_origin_id: current?.origin_id ?? null },
    });
    setFocusedOriginId(origin.origin_id);
  };

  return (
    <PageFrame
      eyebrow="Hourly forecast origins"
      title="Order History"
      description="A 24-hour journal of MONKEY forecast origins—not exchange orders, positions, or trades. One forecast may be selected per asset and horizon."
      status={<StatusBadge status={history.data?.meta.data_mode === 'mock' ? 'MOCK' : 'ACTIVE'} />}
      actions={<Button variant="ghost" icon={<RefreshCw />} onClick={() => void history.refetch()}>Refresh</Button>}
    >
      <div className={styles.notice} role="note"><DatabaseZap aria-hidden="true" /><span><strong>DEMO / MOCK DATA</strong> when mock mode is active. Selection is stored only in this browser and never sends a trading command.</span></div>
      <DetailSurface
        eyebrow="Last 24 hours"
        title="Forecast ledger"
        meta={history.isFetching && history.data ? <StatusBadge status="STALE" /> : undefined}
        aside={selectedOriginId ? (
          detail.isLoading ? <PageState kind="loading" /> : detail.isError ? <PageState kind="error" message="The selected forecast detail could not be loaded." /> : detail.data ? (
            <div className={styles.drawerStack}>
              <div><h3 className={styles.drawerTitle}>{detail.data.origin.asset} · {detail.data.origin.horizon_hours}H origin</h3><p className={styles.drawerText}>{detail.data.origin.origin_id}</p></div>
              <StatusBadge status={outcomeStatus(detail.data.origin.outcome_status)} />
              <ForecastRanges origin={detail.data.origin} />
              <dl className={styles.definitionList}>
                <div><dt>Created</dt><dd>{formatDateTime(detail.data.origin.created_utc, 'UTC')}</dd></div>
                <div><dt>Center</dt><dd>{detail.data.origin.center ? formatCurrency(detail.data.origin.center) : 'Not in public contract'}</dd></div>
                <div><dt>Publication</dt><dd>{detail.data.origin.effective_publication}</dd></div>
                <div><dt>FORTNITE</dt><dd>{detail.data.origin.fortnite_status}</dd></div>
                <div><dt>DOTA</dt><dd>{detail.data.origin.dota_status}</dd></div>
                <div><dt>Wall Street</dt><dd>{detail.data.origin.wall_street_status}</dd></div>
                <div><dt>Selected UTC</dt><dd>{detail.data.origin.selected_utc ? formatDateTime(detail.data.origin.selected_utc, 'UTC') : 'Not selected'}</dd></div>
              </dl>
              {detail.data.origin.notes && <p className={styles.drawerText}>{detail.data.origin.notes}</p>}
            </div>
          ) : null
        ) : <PageState kind="empty" message="Choose a forecast origin to open its detail drawer." />}
      >
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Asset</span>
            <SegmentedControl label="Asset filter" value={asset} onChange={setAsset} options={[{ value: 'ALL', label: 'All' }, { value: 'BTC', label: 'BTC' }, { value: 'ETH', label: 'ETH' }]} />
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Horizon</span>
            <SegmentedControl label="Forecast horizon filter" value={horizon} onChange={setHorizon} options={[{ value: 'ALL', label: 'All' }, { value: '12', label: '12H' }, { value: '24', label: '24H' }]} />
          </div>
        </div>

        {history.isLoading ? <PageState kind="loading" /> : history.isError ? (
          <PageState kind="error" action={<Button icon={<RefreshCw />} onClick={() => void history.refetch()}>Try again</Button>} />
        ) : !history.data?.origins.length ? <PageState kind="empty" /> : (
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <caption className="sr-only">MONKEY forecast origins created in the last 24 hours</caption>
              <thead><tr><th className={styles.selectionCell}>Select</th><th>Origin</th><th>Asset</th><th>Horizon</th><th>P80 range</th><th>Publication</th><th>Outcome</th><th>Window</th></tr></thead>
              <tbody>
                {history.data.origins.map((origin) => {
                  const closed = new Date(origin.selection_deadline_utc).getTime() <= now;
                  return (
                    <tr key={origin.origin_id} className={origin.origin_id === selectedOriginId ? styles.selectedRow : ''}>
                      <td className={styles.selectionCell}>
                        <input type="checkbox" checked={origin.selected_by_user} disabled={closed || selection.isPending} aria-label={`Select ${origin.asset} ${origin.horizon_hours} hour forecast`} onChange={() => selectOrigin(origin)} />
                      </td>
                      <td><button type="button" className={styles.rowButton} onClick={() => setFocusedOriginId(origin.origin_id)}>{origin.origin_id.slice(0, 10)}…</button></td>
                      <td><span className={styles.assetMark}>{origin.asset}</span></td>
                      <td className={styles.mono}>{origin.horizon_hours}h</td>
                      <td className={styles.mono}>{formatCurrency(origin.p80[0])} – {formatCurrency(origin.p80[1])}</td>
                      <td>{origin.effective_publication}</td>
                      <td><StatusBadge status={outcomeStatus(origin.outcome_status)} /></td>
                      <td>{origin.selected_by_user ? <span className={styles.selectedLabel}><CheckCircle2 size={12} /> Selected</span> : <span className={styles.countdown}><Clock3 size={12} /> {remainingLabel(origin.selection_deadline_utc, now)}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {selection.isError && <p className={styles.dangerText} role="alert">Selection was not changed. The window may have closed or another selection changed first.</p>}
        <StatGrid>
          <Stat label="Visible origins" value={history.data?.origins.length ?? 0} detail="24-hour filter" />
          <Stat label="Selected" value={history.data?.origins.filter((item) => item.selected_by_user).length ?? 0} detail="One per asset + horizon" />
          <Stat label="Trading actions" value="0" detail="Selection is advisory only" />
        </StatGrid>
      </DetailSurface>
    </PageFrame>
  );
}

export default OrderHistoryPage;
