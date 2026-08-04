import { ShieldAlert, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from './Button';
import styles from './ui.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, tone = 'primary', onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      <button type="button" className={styles.dialogClose} onClick={onCancel} aria-label="Close confirmation"><X /></button>
      <ShieldAlert aria-hidden="true" className={styles.dialogIcon} />
      <h2>{title}</h2>
      <p>{message}</p>
      <div className={styles.dialogActions}>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}

