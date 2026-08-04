import { Check, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import type { ManualDecisionRequest } from '../../domain/dashboardContracts';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import styles from './ManualDecisionControls.module.css';

interface ManualDecisionControlsProps {
  itemLabel: string;
  disabled?: boolean;
  isMock: boolean;
  isPending: boolean;
  onDecision: (request: ManualDecisionRequest) => void;
}

export function ManualDecisionControls({ itemLabel, disabled = false, isMock, isPending, onDecision }: ManualDecisionControlsProps) {
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [note, setNote] = useState('');

  const confirm = () => {
    if (!decision) return;
    onDecision({ decision, ...(note.trim() ? { operator_note: note.trim() } : {}) });
    setDecision(null);
    setNote('');
  };

  return (
    <div className={styles.controls}>
      <div className={styles.noteField}>
        <label htmlFor={`operator-note-${itemLabel.replace(/[^a-z0-9]/gi, '-')}`}>Optional operator note</label>
        <textarea
          id={`operator-note-${itemLabel.replace(/[^a-z0-9]/gi, '-')}`}
          value={note}
          maxLength={2_000}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Record the reasoning for this manual decision."
          disabled={disabled || isPending}
        />
      </div>
      <div className={styles.actions}>
        <Button variant="primary" icon={<Check />} disabled={disabled || isPending} onClick={() => setDecision('APPROVE')}>Approve</Button>
        <Button variant="danger" icon={<X />} disabled={disabled || isPending} onClick={() => setDecision('REJECT')}>Reject</Button>
      </div>
      <p className={styles.safety}><ShieldCheck aria-hidden="true" />{isMock ? 'Changes local demo state only.' : 'Requires an explicit backend-confirmed manual decision.'}</p>
      <ConfirmDialog
        open={decision !== null}
        title={`${decision === 'APPROVE' ? 'Approve' : 'Reject'} ${itemLabel}?`}
        message={`${isMock ? 'This records a local demo decision only.' : 'This sends a manual review decision to the configured backend.'} It does not modify MONKEY, production code, formulas, or place a trade.`}
        confirmLabel={decision === 'APPROVE' ? 'Confirm approval' : 'Confirm rejection'}
        tone={decision === 'REJECT' ? 'danger' : 'primary'}
        onConfirm={confirm}
        onCancel={() => setDecision(null)}
      />
    </div>
  );
}

