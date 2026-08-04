import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', icon, children, className = '', ...props }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[`button-${variant}`]} ${className}`} {...props}>
      {icon && <span className={styles.buttonIcon} aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

