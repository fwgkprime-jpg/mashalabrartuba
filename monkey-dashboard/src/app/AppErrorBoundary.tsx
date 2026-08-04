import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../components/ui/Button';
import styles from './AppErrorBoundary.module.css';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Dashboard render boundary', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className={styles.boundary}>
        <AlertOctagon aria-hidden="true" />
        <p>Safe render boundary</p>
        <h1>The dashboard view could not be rendered.</h1>
        <span>No MONKEY operation was changed. Reload to reconstruct the read-only interface state.</span>
        <Button variant="primary" icon={<RotateCcw />} onClick={() => window.location.reload()}>Reload dashboard</Button>
      </main>
    );
  }
}

