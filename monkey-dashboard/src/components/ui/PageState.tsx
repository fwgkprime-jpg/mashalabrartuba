import { AlertTriangle, DatabaseZap, LoaderCircle, RadioTower } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './ui.module.css';

interface PageStateProps {
  kind: 'loading' | 'empty' | 'error' | 'offline';
  title?: string;
  message?: string;
  action?: ReactNode;
}

const defaults = {
  loading: { title: 'Synchronizing data', message: 'Reading the latest dashboard snapshot.' },
  empty: { title: 'No records yet', message: 'This module has no data for the current filters.' },
  error: { title: 'Data source unavailable', message: 'The request failed safely. Try again when the source recovers.' },
  offline: { title: 'Offline mode', message: 'Showing the most recent cached dashboard state.' },
};

const icons = {
  loading: LoaderCircle,
  empty: DatabaseZap,
  error: AlertTriangle,
  offline: RadioTower,
};

export function PageState({ kind, title, message, action }: PageStateProps) {
  const Icon = icons[kind];
  return (
    <div className={styles.pageState} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon className={kind === 'loading' ? styles.spin : ''} aria-hidden="true" />
      <strong>{title ?? defaults[kind].title}</strong>
      <p>{message ?? defaults[kind].message}</p>
      {action}
    </div>
  );
}

