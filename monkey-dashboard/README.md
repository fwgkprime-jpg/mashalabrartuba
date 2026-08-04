# Monkey Dashboard

Read-only React and TypeScript operations dashboard built with Vite. React Router, TanStack Query, Zod, Lucide, Vitest, Testing Library, and Playwright are provisioned in the project toolchain.

## Local setup

Requires Node 20.19 or newer and npm 10 or newer.

1. Copy .env.example to .env and adjust its two public values if needed.
2. Run npm ci.
3. Run npm run dev, START-DASHBOARD.cmd on Windows, or sh start-dashboard.sh on POSIX systems.

VITE_DATA_MODE selects mock or API-backed data. VITE_API_BASE_URL is the versioned public API prefix and defaults to /api/v1. Both VITE_ values are compiled into browser assets, so they must never contain passwords, tokens, private keys, embedded URL credentials, or other secrets.

## Commands

| Command | Purpose |
| --- | --- |
| npm run dev | Start Vite on port 5173 |
| npm run build | Type-check and create a production build |
| npm run preview | Preview the production build on port 4173 |
| npm test | Run the configured Vitest suite once |
| npm run test:e2e | Run Playwright with managed Vite and desktop/mobile Chromium projects |
| npm run lint | Run ESLint with zero warnings allowed |
| npm run typecheck | Run the TypeScript project build check |

Install the Chromium browser binary with npx playwright install chromium before the first local end-to-end run. The Playwright configuration starts and stops its own Vite server on 127.0.0.1:4173.

## Container deployment

The Docker image builds the browser bundle with npm ci, then serves only static files from Nginx:

    docker build -t monkey-dashboard .
    docker run --rm -p 8080:80 monkey-dashboard

The image contains no API, authentication service, worker, database, or runtime secrets. VITE_DATA_MODE and VITE_API_BASE_URL may be supplied as Docker build arguments, but only with public values.

Nginx provides SPA fallback, compression, cache headers for static assets, and browser security headers. Its /api/ proxy is an intentionally credential-free loopback placeholder. Replace proxy_pass with the internal API service address during deployment; do not embed credentials in the upstream URL or repository.
