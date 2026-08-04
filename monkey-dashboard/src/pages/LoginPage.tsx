import { ArrowLeft, LockKeyhole, Server, ShieldCheck, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './EntryPages.module.css';

export function LoginPage() {
  return (
    <main className={styles.loginPage}>
      <div className={styles.loginFrame}>
        <section className={styles.loginIntro} aria-labelledby="login-title">
          <Link className={styles.brandLink} to="/" aria-label="Return to dashboard">
            <span className={styles.brandMark} aria-hidden="true">
              M
            </span>
            <span>Monkey Dashboard</span>
          </Link>

          <div>
            <p className={styles.loginEyebrow}>Future VPS access</p>
            <h1 id="login-title" className={styles.loginTitle}>
              Private operations,
              <br />
              when the server is ready.
            </h1>
            <p className={styles.loginLead}>
              This route previews the authentication experience planned for a hardened VPS
              deployment. Access is intentionally unavailable in the local demo.
            </p>
          </div>

          <ul className={styles.featureList} aria-label="Planned security controls">
            <li className={styles.featureItem}>
              <span className={styles.featureIcon} aria-hidden="true">
                <Server size={18} />
              </span>
              Server-side identity and session validation
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureIcon} aria-hidden="true">
                <ShieldCheck size={18} />
              </span>
              Secure, HTTP-only session cookies
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureIcon} aria-hidden="true">
                <LockKeyhole size={18} />
              </span>
              No credentials inside the dashboard bundle
            </li>
          </ul>
        </section>

        <section
          className={styles.loginCard}
          aria-labelledby="access-heading"
          aria-describedby="login-disabled-note"
        >
          <div className={styles.statusPill}>
            <WifiOff size={15} aria-hidden="true" />
            Demo only - authentication disabled
          </div>

          <div className={styles.loginCardHeader}>
            <span className={styles.loginCardIcon} aria-hidden="true">
              <LockKeyhole size={24} />
            </span>
            <div>
              <h2 id="access-heading">Sign in to the VPS</h2>
              <p>Reserved for the production identity service.</p>
            </div>
          </div>

          <div className={styles.disabledPanel} role="group" aria-label="Disabled sign-in fields">
            <label className={styles.loginField} htmlFor="future-login-identity">
              <span>Email or operator ID</span>
              <input
                id="future-login-identity"
                className={styles.disabledInput}
                type="text"
                placeholder="Unavailable in demo mode"
                autoComplete="off"
                value=""
                readOnly
                disabled
              />
            </label>

            <label className={styles.loginField} htmlFor="future-login-password">
              <span>Password</span>
              <input
                id="future-login-password"
                className={styles.disabledInput}
                type="password"
                placeholder="Unavailable in demo mode"
                autoComplete="new-password"
                value=""
                readOnly
                disabled
              />
            </label>

            <button className={styles.loginButton} type="button" disabled>
              Authentication coming with VPS deployment
            </button>
          </div>

          <div id="login-disabled-note" className={styles.securityNote} role="note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              This preview cannot accept, send, validate, or persist credentials. It performs
              no network request and stores no secret data.
            </p>
          </div>

          <Link className={styles.returnLink} to="/">
            <ArrowLeft size={17} aria-hidden="true" />
            Return to the demo dashboard
          </Link>
        </section>
      </div>

      <p className={styles.loginFooter}>
        Public demo surface - no authentication boundary is active
      </p>
    </main>
  );
}

export default LoginPage;
