import { Lightbulb, RefreshCw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { DetailSurface, PageFrame, Stat, StatGrid } from '../components/layout/PageFrame';
import { ManualDecisionControls } from '../components/manual/ManualDecisionControls';
import { Button } from '../components/ui/Button';
import { PageState } from '../components/ui/PageState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { statusForManualReview } from '../domain/statusRegistry';
import { useRecommendationDecisionMutation, useRecommendationsQuery } from '../hooks/useDashboardQueries';
import { formatDateTime } from '../lib/format';
import styles from './OperationsPages.module.css';

export function CrabRecommendationsPage() {
  const recommendations = useRecommendationsQuery();
  const decision = useRecommendationDecisionMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = recommendations.data?.items.find((item) => item.id === selectedId) ?? recommendations.data?.items[0];
  const isMock = recommendations.data?.meta.data_mode === 'mock';

  return (
    <PageFrame
      eyebrow="OpenClaw proposal queue"
      title="Crab Recommendations"
      description="Serious improvement proposals remain advisory until a human explicitly approves or rejects them. No recommendation can rewrite MONKEY automatically."
      accent="purple"
      status={<StatusBadge status={isMock ? 'MOCK' : 'PENDING'} />}
      actions={<Button variant="ghost" icon={<RefreshCw />} onClick={() => void recommendations.refetch()}>Refresh</Button>}
    >
      <div className={styles.notice} role="note"><ShieldAlert aria-hidden="true" /><span><strong>Manual review boundary.</strong> Approve and reject only record a decision. They never change production, formulas, or runtime behavior.</span></div>
      <DetailSurface
        eyebrow="Review inbox"
        title="OpenClaw proposals"
        aside={selected ? (
          <div className={styles.drawerStack}>
            <StatusBadge status={statusForManualReview(selected.status)} />
            <div><h3 className={styles.drawerTitle}>{selected.title}</h3><p className={styles.drawerText}>{selected.rationale}</p></div>
            <dl className={styles.definitionList}>
              <div><dt>Priority</dt><dd>{selected.priority}</dd></div>
              <div><dt>Risk</dt><dd>{selected.risk}</dd></div>
              <div><dt>Created</dt><dd>{formatDateTime(selected.created_utc, 'UTC')}</dd></div>
              <div><dt>Review</dt><dd>{selected.manual_review_required ? 'Human required' : 'Unavailable'}</dd></div>
              {selected.decision && <div><dt>Decision</dt><dd>{selected.decision.decision} · {selected.decision.decision_scope}</dd></div>}
            </dl>
            <ManualDecisionControls
              itemLabel={`recommendation ${selected.id}`}
              disabled={selected.status === 'APPROVED' || selected.status === 'REJECTED'}
              isMock={isMock}
              isPending={decision.isPending}
              onDecision={(request) => decision.mutate({ id: selected.id, request })}
            />
            {decision.isError && <p className={styles.dangerText} role="alert">The decision was not recorded.</p>}
          </div>
        ) : <PageState kind="empty" />}
      >
        {recommendations.isLoading ? <PageState kind="loading" /> : recommendations.isError ? (
          <PageState kind="error" action={<Button onClick={() => void recommendations.refetch()}>Try again</Button>} />
        ) : !recommendations.data?.items.length ? <PageState kind="empty" /> : (
          <div className={styles.recordGrid}>
            {recommendations.data.items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`${styles.recordCard} ${selected?.id === item.id ? styles.recordCardSelected : ''}`}
                onClick={() => setSelectedId(item.id)}
                aria-pressed={selected?.id === item.id}
              >
                <span className={styles.cardHeader}><span><h3>{item.title}</h3><time>{formatDateTime(item.created_utc, 'UTC')}</time></span><StatusBadge status={statusForManualReview(item.status)} /></span>
                <span className={styles.cardBody}><span className={styles.tag}>{item.priority} priority</span><p>{item.rationale}</p><p><strong>Risk:</strong> {item.risk}</p></span>
                <span className={styles.cardFooter}><span className={styles.warningText}>Manual review required</span><Lightbulb size={17} aria-hidden="true" /></span>
              </button>
            ))}
          </div>
        )}
        <StatGrid>
          <Stat label="Total proposals" value={recommendations.data?.items.length ?? 0} />
          <Stat label="Awaiting review" value={recommendations.data?.items.filter((item) => item.status === 'NEW').length ?? 0} />
          <Stat label="Automatic changes" value="0" detail="Hard safety boundary" />
        </StatGrid>
      </DetailSurface>
    </PageFrame>
  );
}

export default CrabRecommendationsPage;

