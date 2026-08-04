import type { HTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'aside' | 'div';
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function GlassPanel({
  as: Element = 'section',
  eyebrow,
  title,
  action,
  children,
  className = '',
  ...props
}: GlassPanelProps) {
  return (
    <Element className={`${styles.glassPanel} ${className}`} {...props}>
      {(eyebrow || title || action) && (
        <header className={styles.panelHeader}>
          <div>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            {title && <h2 className={styles.panelTitle}>{title}</h2>}
          </div>
          {action && <div className={styles.panelAction}>{action}</div>}
        </header>
      )}
      {children}
    </Element>
  );
}

