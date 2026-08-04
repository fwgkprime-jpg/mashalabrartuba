import { MapPinOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageFrame } from '../components/layout/PageFrame';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <PageFrame eyebrow="Route unavailable" title="Outside the city grid" description="This dashboard route does not exist or has moved.">
      <div className={styles.notFound}>
        <MapPinOff aria-hidden="true" />
        <strong>404</strong>
        <p>No module is registered at this address.</p>
        <Link to="/">Return to City Overview</Link>
      </div>
    </PageFrame>
  );
}

