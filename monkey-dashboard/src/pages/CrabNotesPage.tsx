import { BookOpenCheck, LockKeyhole, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DetailSurface, PageFrame, Stat, StatGrid } from '../components/layout/PageFrame';
import { ManualDecisionControls } from '../components/manual/ManualDecisionControls';
import { Button } from '../components/ui/Button';
import { PageState } from '../components/ui/PageState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { statusForManualReview } from '../domain/statusRegistry';
import { useNoteDecisionMutation, useNotesQuery } from '../hooks/useDashboardQueries';
import { formatDateTime } from '../lib/format';
import styles from './OperationsPages.module.css';

export function CrabNotesPage() {
  const notes = useNotesQuery();
  const decision = useNoteDecisionMutation();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return notes.data?.items ?? [];
    return (notes.data?.items ?? []).filter((note) => [note.title, note.body, ...note.weaknesses, ...note.risky_changes, ...note.proposals].join(' ').toLowerCase().includes(needle));
  }, [notes.data?.items, query]);
  const selected = notes.data?.items.find((item) => item.id === selectedId) ?? filtered[0];
  const isMock = notes.data?.meta.data_mode === 'mock';

  return (
    <PageFrame eyebrow="Manual knowledge review" title="Crab Notes" description="Immutable OpenClaw observations, weaknesses, and proposals rendered as safe text for deliberate human review." accent="purple" status={<StatusBadge status={isMock ? 'MOCK' : 'PENDING'} />}>
      <div className={styles.notice} role="note"><LockKeyhole aria-hidden="true" /><span>Notes are displayed as text without HTML injection. Decisions are manual and cannot alter MONKEY.</span></div>
      <DetailSurface
        eyebrow="Review notebook"
        title="OpenClaw notes"
        aside={selected ? (
          <div className={styles.drawerStack}>
            <StatusBadge status={statusForManualReview(selected.status)} />
            <div><h3 className={styles.drawerTitle}>{selected.title}</h3><p className={styles.drawerText}>{selected.body}</p></div>
            <dl className={styles.definitionList}><div><dt>Created UTC</dt><dd>{formatDateTime(selected.created_utc, 'UTC')}</dd></div><div><dt>Timestamp</dt><dd>{selected.immutable_timestamp ? 'Immutable' : 'Unknown'}</dd></div></dl>
            <div><h4 className={styles.drawerTitle}>Weaknesses</h4><ul className={styles.tagList}>{selected.weaknesses.map((item) => <li className={styles.tag} key={item}>{item}</li>)}</ul></div>
            <div><h4 className={styles.drawerTitle}>Risky changes</h4><ul className={styles.tagList}>{selected.risky_changes.map((item) => <li className={styles.tag} key={item}>{item}</li>)}</ul></div>
            <div><h4 className={styles.drawerTitle}>Proposals</h4><ul className={styles.tagList}>{selected.proposals.map((item) => <li className={styles.tag} key={item}>{item}</li>)}</ul></div>
            <ManualDecisionControls itemLabel={`note ${selected.id}`} disabled={selected.status === 'APPROVED' || selected.status === 'REJECTED'} isMock={isMock} isPending={decision.isPending} onDecision={(request) => decision.mutate({ id: selected.id, request })} />
            {decision.isError && <p className={styles.dangerText} role="alert">The note decision was not recorded.</p>}
          </div>
        ) : <PageState kind="empty" />}
      >
        <div className={styles.toolbar}>
          <input className={styles.searchInput} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes, weaknesses, or proposals" aria-label="Search Crab Notes" />
          <Button variant="ghost" icon={<RefreshCw />} onClick={() => void notes.refetch()}>Refresh</Button>
        </div>
        {notes.isLoading ? <PageState kind="loading" /> : notes.isError ? <PageState kind="error" /> : filtered.length === 0 ? <PageState kind="empty" message="No notes match this search." /> : (
          <div className={styles.recordGrid}>{filtered.map((note) => (
            <button key={note.id} type="button" className={`${styles.recordCard} ${selected?.id === note.id ? styles.recordCardSelected : ''}`} onClick={() => setSelectedId(note.id)} aria-pressed={selected?.id === note.id}>
              <span className={styles.cardHeader}><span><h3>{note.title}</h3><time>{formatDateTime(note.created_utc, 'UTC')}</time></span><StatusBadge status={statusForManualReview(note.status)} /></span>
              <span className={styles.cardBody}><p>{note.body}</p><span className={styles.tag}>{note.weaknesses.length} weaknesses</span></span>
              <span className={styles.cardFooter}><span>Immutable timestamp</span><BookOpenCheck size={17} aria-hidden="true" /></span>
            </button>
          ))}</div>
        )}
        <StatGrid><Stat label="Visible notes" value={filtered.length} /><Stat label="New" value={notes.data?.items.filter((item) => item.status === 'NEW').length ?? 0} /><Stat label="Production writes" value="0" /></StatGrid>
      </DetailSurface>
    </PageFrame>
  );
}

export default CrabNotesPage;

