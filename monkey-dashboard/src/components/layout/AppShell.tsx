import {
  Activity,
  BookOpenText,
  Bot,
  BrainCircuit,
  ChartNoAxesCombined,
  Clock3,
  CodeXml,
  History,
  LayoutDashboard,
  LogIn,
  Menu,
  MessageSquareWarning,
  Settings,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useClock } from '../../hooks/useClock';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { StatusBadge } from '../ui/StatusBadge';
import styles from './AppShell.module.css';

const navigation = [
  { to: '/', label: 'City', icon: LayoutDashboard, end: true },
  { to: '/monkey', label: 'Monkey', icon: BrainCircuit },
  { to: '/structure', label: 'Structure', icon: ChartNoAxesCombined },
  { to: '/order-history', label: 'Order History', icon: History },
  { to: '/crab-recommendations', label: 'Recommendations', icon: MessageSquareWarning },
  { to: '/crab-notes', label: 'Crab Notes', icon: BookOpenText },
  { to: '/fix-code', label: 'Fix Code', icon: CodeXml },
  { to: '/diary', label: 'Diary', icon: Bot },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/login', label: 'Login', icon: LogIn },
] as const;

function formatClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const online = useOnlineStatus();
  const now = useClock();
  const dataMode = (import.meta.env.VITE_DATA_MODE ?? 'mock').toLowerCase();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen]);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">Skip to dashboard content</a>
      <header className={styles.topbar}>
        <NavLink to="/" className={styles.brand} aria-label="FINCEPT Monkey city overview" onClick={() => setMenuOpen(false)}>
          <span className={styles.brandMark} aria-hidden="true"><BrainCircuit /></span>
          <span>
            <strong>FINCEPT MONKEY</strong>
            <small>OpenClaw command observatory</small>
          </span>
        </NavLink>

        <div className={styles.headerTelemetry} aria-label="Dashboard status">
          <StatusBadge status={online ? 'ONLINE' : 'UNAVAILABLE'} pulse={online} />
          <StatusBadge status={dataMode === 'mock' ? 'MOCK' : 'ACTIVE'} />
          <span className={styles.clock}><Clock3 aria-hidden="true" /> UTC {formatClock(now, 'UTC')}</span>
          <span className={styles.clock}>KYIV {formatClock(now, 'Europe/Kyiv')}</span>
        </div>

        <button
          className={styles.menuButton}
          type="button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {!online && (
        <div className={styles.offlineBanner} role="status">
          <WifiOff aria-hidden="true" /> Offline — cached data remains visible and writes stay local.
        </div>
      )}

      <nav id="primary-navigation" className={`${styles.navigation} ${menuOpen ? styles.navigationOpen : ''}`} aria-label="Primary">
        {navigation.map(({ to, label, icon: Icon, ...item }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in item ? item.end : false}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {menuOpen && <button type="button" className={styles.backdrop} aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <main id="main-content" className={styles.content} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
