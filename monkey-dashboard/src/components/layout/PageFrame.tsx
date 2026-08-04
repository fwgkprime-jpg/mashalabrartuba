import { ArrowLeft, Radio } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './PageFrame.module.css';

interface PageFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  accent?: 'cyan' | 'purple' | 'orange';
  status?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageFrame({ eyebrow, title, description, accent = 'cyan', status, actions, children }: PageFrameProps) {
  return (
    <div className={`${styles.page} ${styles[`accent-${accent}`]}`}>
      <header className={styles.pageHeader}>
        <div className={styles.headerCopy}>
          <Link to="/" className={styles.backLink}><ArrowLeft aria-hidden="true" /> City overview</Link>
          <span className={styles.eyebrow}><Radio aria-hidden="true" /> {eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className={styles.headerAside}>
          {status}
          {actions && <div className={styles.headerActions}>{actions}</div>}
        </div>
      </header>
      {children}
    </div>
  );
}

interface DetailSurfaceProps {
  title: string;
  eyebrow?: string;
  meta?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}

export function DetailSurface({ title, eyebrow, meta, children, aside }: DetailSurfaceProps) {
  return (
    <div className={`${styles.detailGrid} ${aside ? '' : styles.detailGridSingle}`}>
      <section className={styles.detailMain}>
        {(eyebrow || title || meta) && (
          <header className={styles.detailHeader}>
            <div>
              {eyebrow && <span>{eyebrow}</span>}
              <h2>{title}</h2>
            </div>
            {meta}
          </header>
        )}
        {children}
      </section>
      {aside && <aside className={styles.detailDrawer} aria-label={`${title} details`}>{aside}</aside>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.statGrid}>{children}</div>;
}

export function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

