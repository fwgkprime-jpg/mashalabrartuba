import type { HTMLAttributes } from 'react';
import { statusRegistry, type StatusCode } from '../../domain/statusRegistry';
import styles from './ui.module.css';

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusCode;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse = false, className = '', ...props }: StatusBadgeProps) {
  const definition = statusRegistry[status];
  return (
    <span
      className={`${styles.statusBadge} ${styles[`tone-${definition.tone}`]} ${pulse ? styles.pulse : ''} ${className}`}
      title={definition.description}
      data-status={status}
      {...props}
    >
      <span className={styles.statusLed} aria-hidden="true" />
      {definition.label}
    </span>
  );
}

