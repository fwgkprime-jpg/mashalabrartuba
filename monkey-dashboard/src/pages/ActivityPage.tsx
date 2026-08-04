import {
  Activity,
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  CircleDot,
  CloudOff,
  Flag,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { DetailSurface, PageFrame } from '../components/layout/PageFrame';
import { Button } from '../components/ui/Button';
import { PageState } from '../components/ui/PageState';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { ActivityEvent, ActivityQuery } from '../domain/dashboardContracts';
import { useActivityQuery } from '../hooks/useDashboardQueries';
import { formatDateTime, formatRelativeTime } from '../lib/format';
import styles from './JournalPages.module.css';

type ActivitySeverity = NonNullable<ActivityQuery['severity']>;
type SeverityFilter = 'all' | ActivitySeverity;

const severityOptions: ReadonlyArray<{ value: SeverityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

const severityClasses: Record<ActivityEvent['severity'], string> = {
  info: styles.eventInfo,
  success: styles.eventSuccess,
  warning: styles.eventWarning,
  error: styles.eventSeverityError,
};

function formatEventKind(kind: ActivityEvent['kind']): string {
  return kind
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function eventIcon(kind: ActivityEvent['kind']): ReactNode {
  if (kind === 'ERROR') return <AlertTriangle aria-hidden="true" />;
  if (kind === 'RECOVERY') return <RotateCcw aria-hidden="true" />;
  if (kind === 'STAGE_STARTED') return <CircleDot aria-hidden="true" />;
  if (kind === 'STAGE_COMPLETED') return <CheckCircle2 aria-hidden="true" />;
  if (kind === 'DIARY_ENTRY') return <BookOpenText aria-hidden="true" />;
  if (kind === 'MONKEY_RESULT') return <Flag aria-hidden="true" />;
  if (kind === 'RECOMMENDATION_CREATED') return <Sparkles aria-hidden="true" />;
  return <Activity aria-hidden="true" />;
}

function eventToneClass(event: ActivityEvent): string {
  if (event.kind === 'ERROR') return styles.eventError;
  if (event.kind === 'RECOVERY') return styles.eventRecovery;
  return severityClasses[event.severity];
}

export function ActivityPage() {
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const queryInput = useMemo<ActivityQuery>(
    () => ({
      limit: 200,
      ...(severity === 'all' ? {} : { severity }),
    }),
    [severity],
  );
  const activity = useActivityQuery(queryInput);
  const timeline = useMemo(
    () =>
      [...(activity.data?.items ?? [])].sort((left, right) => {
        const timestampOrder = left.occurred_at_utc.localeCompare(right.occurred_at_utc);
        if (timestampOrder !== 0) return timestampOrder;
        return (left.sequence ?? 0) - (right.sequence ?? 0);
      }),
    [activity.data?.items],
  );
  const isMock = activity.data?.meta.data_mode === 'mock';
  const isStale = activity.data?.meta.stale === true;
  const queryFailedWithCache = activity.isError && Boolean(activity.data);
  const pageStatus = activity.isError && !activity.data
    ? 'DEGRADED'
    : isStale
      ? 'STALE'
      : isMock
        ? 'MOCK'
        : 'ACTIVE';

  return (
    <PageFrame
      eyebrow="End-to-end event stream"
      title="Activity"
      description="A complete chronological view of stage transitions, results, warnings, errors, and recoveries across dashboard runs."
      status={<StatusBadge status={pageStatus} />}
      actions={
        <Button
          variant="ghost"
          icon={
            <RefreshCw
              className={activity.isFetching ? styles.spin : undefined}
              aria-hidden="true"
            />
          }
          onClick={() => void activity.refetch()}
          disabled={activity.isFetching}
        >
          {activity.isFetching ? 'Refreshing' : 'Refresh'}
        </Button>
      }
    >
      {isMock && (
        <div className={styles.demoNotice} role="note">
          <Activity aria-hidden="true" />
          <span>
            <strong>DEMO / MOCK DATA</strong> Timeline events are synthetic and do not represent
            production actions.
          </span>
        </div>
      )}

      {(isStale || queryFailedWithCache) && (
        <div className={styles.staleBanner} role="status">
          <CloudOff aria-hidden="true" />
          <span>
            {queryFailedWithCache
              ? 'The latest refresh failed. Keeping the last safe activity snapshot on screen.'
              : 'The data source marked this activity snapshot as stale.'}
          </span>
        </div>
      )}

      <DetailSurface
        eyebrow="Oldest to newest"
        title="Full event timeline"
        meta={
          <span className={styles.resultCount} aria-live="polite">
            {timeline.length} {timeline.length === 1 ? 'event' : 'events'}
          </span>
        }
      >
        <div className={styles.activityToolbar}>
          <div>
            <span className={styles.filterLabel}>Severity</span>
            <SegmentedControl
              label="Activity severity filter"
              value={severity}
              options={severityOptions}
              onChange={setSeverity}
            />
          </div>
          <p>
            Up to 200 matching events are shown in chronological order with their complete
            public event metadata.
          </p>
        </div>

        {activity.isLoading ? (
          <PageState kind="loading" message="Reading the full activity timeline." />
        ) : activity.isError && !activity.data ? (
          <PageState
            kind="error"
            message="The activity stream could not be loaded."
            action={
              <Button onClick={() => void activity.refetch()} icon={<RefreshCw />}>
                Try again
              </Button>
            }
          />
        ) : timeline.length === 0 ? (
          <PageState
            kind="empty"
            title="No activity at this severity"
            message="Choose another severity to inspect the chronological event stream."
            action={
              severity !== 'all' ? (
                <Button variant="secondary" onClick={() => setSeverity('all')}>
                  Show all events
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ol className={styles.timeline} aria-label="Chronological activity events">
            {timeline.map((event) => (
              <li className={styles.timelineItem} key={event.id}>
                <span
                  className={styles.timelineRail}
                  aria-hidden="true"
                >
                  <span className={styles.timelineDot}>{eventIcon(event.kind)}</span>
                </span>

                <article
                  className={styles.timelineCard + ' ' + eventToneClass(event)}
                  aria-labelledby={'event-title-' + event.id}
                >
                  <header className={styles.eventHeader}>
                    <div>
                      <span className={styles.eventKind}>{formatEventKind(event.kind)}</span>
                      <h3 id={'event-title-' + event.id}>{event.title}</h3>
                    </div>
                    <StatusBadge status={event.status} />
                  </header>

                  <p className={styles.eventMessage}>{event.message}</p>

                  <dl className={styles.eventMeta}>
                    <div>
                      <dt>Kind</dt>
                      <dd>{event.kind}</dd>
                    </div>
                    <div>
                      <dt>Stage</dt>
                      <dd>{event.stage ?? 'Not assigned'}</dd>
                    </div>
                    <div>
                      <dt>Run</dt>
                      <dd>{event.run_id ?? 'System-wide event'}</dd>
                    </div>
                    <div>
                      <dt>Sequence</dt>
                      <dd>{event.sequence === null ? 'Not sequenced' : '#' + event.sequence}</dd>
                    </div>
                    <div>
                      <dt>Severity</dt>
                      <dd className={styles.severityValue}>{event.severity}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{event.status}</dd>
                    </div>
                    <div className={styles.timestampMeta}>
                      <dt>Occurred</dt>
                      <dd>
                        <time dateTime={event.occurred_at_utc}>
                          {formatDateTime(event.occurred_at_utc, 'UTC')}
                        </time>
                        <span>{formatRelativeTime(event.occurred_at_utc)}</span>
                      </dd>
                    </div>
                    {event.related_id && (
                      <div>
                        <dt>Related ID</dt>
                        <dd>{event.related_id}</dd>
                      </div>
                    )}
                  </dl>
                </article>
              </li>
            ))}
          </ol>
        )}

        {activity.data?.next_cursor && (
          <p className={styles.timelineLimit} role="note">
            More than 200 matching events exist. Narrow the severity filter to inspect older
            records in this bounded public view.
          </p>
        )}
      </DetailSurface>
    </PageFrame>
  );
}

export default ActivityPage;
