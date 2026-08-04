import {
  BookOpenText,
  CalendarDays,
  CloudOff,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { DetailSurface, PageFrame } from '../components/layout/PageFrame';
import { Button } from '../components/ui/Button';
import { PageState } from '../components/ui/PageState';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { DiaryQuery } from '../domain/dashboardContracts';
import { useDiaryEntryQuery, useDiaryQuery } from '../hooks/useDashboardQueries';
import { formatDateTime } from '../lib/format';
import styles from './JournalPages.module.css';

function utcDateValue(offsetDays = 0): string {
  const value = new Date();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

function utcBoundary(date: string, endOfDay = false): string {
  return date + (endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z');
}

export function DiaryPage() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim());

  const queryInput = useMemo<DiaryQuery>(
    () => ({
      ...(deferredSearch ? { query: deferredSearch } : {}),
      ...(dateFrom ? { date_from: utcBoundary(dateFrom) } : {}),
      ...(dateTo ? { date_to: utcBoundary(dateTo, true) } : {}),
    }),
    [dateFrom, dateTo, deferredSearch],
  );

  const diary = useDiaryQuery(queryInput);
  const entries = diary.data?.entries ?? [];
  const activeEntryId =
    entries.find((entry) => entry.id === selectedId)?.id ?? entries[0]?.id ?? null;
  const detail = useDiaryEntryQuery(activeEntryId);
  const isMock = diary.data?.meta.data_mode === 'mock';
  const isStale = diary.data?.meta.stale === true;
  const queryFailedWithCache = diary.isError && Boolean(diary.data);
  const today = utcDateValue();
  const sevenDaysAgo = utcDateValue(-6);
  const hasFilters = Boolean(search || dateFrom || dateTo);
  const pageStatus = diary.isError && !diary.data
    ? 'DEGRADED'
    : isStale
      ? 'STALE'
      : isMock
        ? 'MOCK'
        : 'ACTIVE';

  const resetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSelectedId(null);
  };

  const selectRecentDays = (days: 1 | 7) => {
    setDateFrom(days === 1 ? today : sevenDaysAgo);
    setDateTo(today);
    setSelectedId(null);
  };

  return (
    <PageFrame
      eyebrow="OpenClaw first-person log"
      title="Diary"
      description="Search the operator's first-person observations, doubts, goals, and conclusions without interpreting entry text as HTML."
      accent="orange"
      status={<StatusBadge status={pageStatus} />}
      actions={
        <Button
          variant="ghost"
          icon={
            <RefreshCw
              className={diary.isFetching ? styles.spin : undefined}
              aria-hidden="true"
            />
          }
          onClick={() => void diary.refetch()}
          disabled={diary.isFetching}
        >
          {diary.isFetching ? 'Refreshing' : 'Refresh'}
        </Button>
      }
    >
      <div
        className={isMock ? styles.demoNotice : styles.safeNotice}
        role="note"
      >
        {isMock ? <BookOpenText aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
        <span>
          <strong>{isMock ? 'DEMO / MOCK DATA' : 'READ-ONLY JOURNAL'}</strong>
          {' '}
          Entries are rendered only as escaped React text. No diary content is parsed or
          injected as HTML.
        </span>
      </div>

      {(isStale || queryFailedWithCache) && (
        <div className={styles.staleBanner} role="status">
          <CloudOff aria-hidden="true" />
          <span>
            {queryFailedWithCache
              ? 'The latest refresh failed. Keeping the last safe diary snapshot on screen.'
              : 'The data source marked this diary snapshot as stale.'}
          </span>
        </div>
      )}

      <DetailSurface
        eyebrow="Calendar and text index"
        title="OpenClaw entries"
        meta={
          <span className={styles.resultCount} aria-live="polite">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        }
        aside={
          !activeEntryId ? (
            <PageState
              kind="empty"
              title="No diary entry selected"
              message="Adjust the search or date range to choose an entry."
            />
          ) : detail.isLoading ? (
            <PageState kind="loading" message="Opening the selected first-person entry." />
          ) : detail.isError ? (
            <PageState
              kind="error"
              message="The selected diary entry could not be loaded."
              action={
                <Button onClick={() => void detail.refetch()} icon={<RefreshCw />}>
                  Retry detail
                </Button>
              }
            />
          ) : detail.data ? (
            <article className={styles.diaryDrawer}>
              <div className={styles.drawerHeading}>
                <div>
                  <span className={styles.drawerEyebrow}>OpenClaw, first person</span>
                  <h3>{detail.data.entry.title}</h3>
                </div>
                <StatusBadge
                  status={
                    detail.data.meta.stale
                      ? 'STALE'
                      : detail.data.meta.data_mode === 'mock'
                        ? 'MOCK'
                        : 'ACTIVE'
                  }
                />
              </div>

              <div className={styles.entryPills} aria-label="Entry mood and mode">
                <span className={styles.moodPill}>Mood: {detail.data.entry.mood}</span>
                <span className={styles.modePill}>Mode: {detail.data.entry.mode}</span>
              </div>

              <time
                className={styles.drawerTime}
                dateTime={detail.data.entry.created_utc}
              >
                {formatDateTime(detail.data.entry.created_utc, 'UTC')}
              </time>

              <p className={styles.entryBody}>{detail.data.entry.body}</p>

              <div className={styles.diarySections}>
                <section className={styles.diarySection}>
                  <h4>Observations</h4>
                  <ul>
                    {detail.data.entry.observations.map((observation) => (
                      <li key={observation}>{observation}</li>
                    ))}
                  </ul>
                </section>

                <section className={styles.diarySection}>
                  <h4>Doubts</h4>
                  <ul>
                    {detail.data.entry.doubts.map((doubt) => (
                      <li key={doubt}>{doubt}</li>
                    ))}
                  </ul>
                </section>

                <section className={styles.diarySection}>
                  <h4>Goals</h4>
                  <ul>
                    {detail.data.entry.goals.map((goal) => (
                      <li key={goal}>{goal}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className={styles.conclusion}>
                <span>Day conclusion</span>
                <p>{detail.data.entry.day_conclusion}</p>
              </section>

              <section className={styles.relatedRuns} aria-labelledby="related-runs-heading">
                <h4 id="related-runs-heading">Related runs</h4>
                {detail.data.entry.related_run_ids.length ? (
                  <ul>
                    {detail.data.entry.related_run_ids.map((runId) => (
                      <li key={runId}>{runId}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No run references recorded.</p>
                )}
              </section>
            </article>
          ) : null
        }
      >
        <div className={styles.diaryToolbar} aria-label="Diary filters">
          <label className={styles.searchField}>
            <span>Full-text search</span>
            <span className={styles.inputWithIcon}>
              <Search aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setSelectedId(null);
                }}
                placeholder="Search entries and observations"
              />
            </span>
          </label>

          <div className={styles.dateFields}>
            <label className={styles.dateField}>
              <span>From date (UTC)</span>
              <span className={styles.inputWithIcon}>
                <CalendarDays aria-hidden="true" />
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => {
                    const next = event.currentTarget.value;
                    setDateFrom(next);
                    if (next && dateTo && next > dateTo) setDateTo(next);
                    setSelectedId(null);
                  }}
                />
              </span>
            </label>

            <label className={styles.dateField}>
              <span>To date (UTC)</span>
              <span className={styles.inputWithIcon}>
                <CalendarDays aria-hidden="true" />
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => {
                    const next = event.currentTarget.value;
                    setDateTo(next);
                    if (next && dateFrom && next < dateFrom) setDateFrom(next);
                    setSelectedId(null);
                  }}
                />
              </span>
            </label>
          </div>

          <div className={styles.quickFilters} aria-label="Quick date filters">
            <Button
              type="button"
              variant="secondary"
              aria-pressed={dateFrom === today && dateTo === today}
              onClick={() => selectRecentDays(1)}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="secondary"
              aria-pressed={dateFrom === sevenDaysAgo && dateTo === today}
              onClick={() => selectRecentDays(7)}
            >
              Last 7 days
            </Button>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                icon={<X />}
                onClick={resetFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {diary.isLoading ? (
          <PageState kind="loading" message="Searching the OpenClaw diary index." />
        ) : diary.isError && !diary.data ? (
          <PageState
            kind="error"
            message="The diary index could not be loaded."
            action={
              <Button onClick={() => void diary.refetch()} icon={<RefreshCw />}>
                Try again
              </Button>
            }
          />
        ) : entries.length === 0 ? (
          <PageState
            kind="empty"
            title="No matching diary entries"
            message="Try a wider UTC date range or a different full-text search."
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={styles.diaryList} aria-label="Diary entries">
            {entries.map((entry) => {
              const selected = entry.id === activeEntryId;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={
                    styles.diaryCard + (selected ? ' ' + styles.diaryCardSelected : '')
                  }
                  aria-pressed={selected}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <span className={styles.diaryCardHeader}>
                    <span>
                      <span className={styles.diaryCardTitle}>{entry.title}</span>
                      <time dateTime={entry.created_utc}>
                        {formatDateTime(entry.created_utc, 'UTC')}
                      </time>
                    </span>
                    <BookOpenText aria-hidden="true" />
                  </span>
                  <span className={styles.entryPills}>
                    <span className={styles.moodPill}>{entry.mood}</span>
                    <span className={styles.modePill}>{entry.mode}</span>
                  </span>
                  <span className={styles.diaryCardConclusion}>
                    {entry.day_conclusion}
                  </span>
                  <span className={styles.diaryCardFooter}>
                    <span>{entry.related_run_ids.length} related run(s)</span>
                    <span>Open entry</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </DetailSurface>
    </PageFrame>
  );
}

export default DiaryPage;
