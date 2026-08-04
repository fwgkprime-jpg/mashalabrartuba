import { CodeXml, FileWarning, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { DetailSurface, PageFrame, Stat, StatGrid } from '../components/layout/PageFrame';
import { ManualDecisionControls } from '../components/manual/ManualDecisionControls';
import { Button } from '../components/ui/Button';
import { PageState } from '../components/ui/PageState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { statusForManualReview } from '../domain/statusRegistry';
import { useFixCodeQuery, useFixDecisionMutation } from '../hooks/useDashboardQueries';
import { formatDateTime } from '../lib/format';
import styles from './OperationsPages.module.css';

export function FixCodePage() {
  const fixes = useFixCodeQuery();
  const decision = useFixDecisionMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = fixes.data?.items.find((item) => item.id === selectedId) ?? fixes.data?.items[0];
  const isMock = fixes.data?.meta.data_mode === 'mock';

  return (
    <PageFrame eyebrow="Code repair proposals" title="Fix Code" description="A review-only queue of detected errors and proposed patches. This interface has no code execution or patch-application capability." accent="purple" status={<StatusBadge status={isMock ? 'MOCK' : 'PENDING'} />}>
      <div className={styles.notice} role="note"><FileWarning aria-hidden="true" /><span><strong>Auto-apply is permanently off.</strong> Approving a proposal records intent only; it never edits a file.</span></div>
      <DetailSurface
        eyebrow="Manual repair review"
        title="Proposed fixes"
        aside={selected ? (
          <div className={styles.drawerStack}>
            <StatusBadge status={statusForManualReview(selected.status)} />
            <div><h3 className={styles.drawerTitle}>{selected.title}</h3><p className={styles.drawerText}>{selected.error_summary}</p></div>
            <dl className={styles.definitionList}>
              <div><dt>Risk</dt><dd>{selected.risk_level}</dd></div><div><dt>Tests</dt><dd>{selected.test_status}</dd></div><div><dt>Auto apply</dt><dd>{String(selected.auto_apply)}</dd></div><div><dt>Created</dt><dd>{formatDateTime(selected.created_utc, 'UTC')}</dd></div>
            </dl>
            <div><h4 className={styles.drawerTitle}>Affected files</h4><ul className={styles.tagList}>{selected.affected_files.map((file) => <li className={styles.tag} key={file}>{file}</li>)}</ul></div>
            <div><h4 className={styles.drawerTitle}>Proposed fix</h4><p className={styles.drawerText}>{selected.proposed_fix}</p></div>
            <div><h4 className={styles.drawerTitle}>Diff preview placeholder</h4><pre className={styles.codePreview}>{selected.diff_preview}</pre></div>
            <ManualDecisionControls itemLabel={`fix proposal ${selected.id}`} disabled={selected.status === 'APPROVED' || selected.status === 'REJECTED'} isMock={isMock} isPending={decision.isPending} onDecision={(request) => decision.mutate({ id: selected.id, request })} />
            {decision.isError && <p className={styles.dangerText} role="alert">The proposal decision was not recorded.</p>}
          </div>
        ) : <PageState kind="empty" />}
      >
        <div className={styles.toolbar}><span className={styles.filterLabel}>No execution surface · no patch endpoint</span><Button variant="ghost" icon={<RefreshCw />} onClick={() => void fixes.refetch()}>Refresh</Button></div>
        {fixes.isLoading ? <PageState kind="loading" /> : fixes.isError ? <PageState kind="error" /> : !fixes.data?.items.length ? <PageState kind="empty" /> : (
          <div className={styles.recordGrid}>{fixes.data.items.map((fix) => (
            <button key={fix.id} type="button" className={`${styles.recordCard} ${selected?.id === fix.id ? styles.recordCardSelected : ''}`} onClick={() => setSelectedId(fix.id)} aria-pressed={selected?.id === fix.id}>
              <span className={styles.cardHeader}><span><h3>{fix.title}</h3><time>{formatDateTime(fix.created_utc, 'UTC')}</time></span><StatusBadge status={statusForManualReview(fix.status)} /></span>
              <span className={styles.cardBody}><p>{fix.error_summary}</p><span className={styles.tag}>{fix.risk_level} risk</span> <span className={styles.tag}>Tests {fix.test_status}</span></span>
              <span className={styles.cardFooter}><span className={styles.warningText}>Manual only · auto_apply=false</span><CodeXml size={17} aria-hidden="true" /></span>
            </button>
          ))}</div>
        )}
        <StatGrid><Stat label="Proposals" value={fixes.data?.items.length ?? 0} /><Stat label="Tested PASS" value={fixes.data?.items.filter((item) => item.test_status === 'PASS').length ?? 0} /><Stat label="Patches applied" value="0" detail="By design" /></StatGrid>
      </DetailSurface>
    </PageFrame>
  );
}

export default FixCodePage;
