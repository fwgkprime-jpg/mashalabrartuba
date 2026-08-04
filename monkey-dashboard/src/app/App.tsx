import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { PageState } from '../components/ui/PageState';
import { DashboardEventsBridge } from '../hooks/useDashboardQueries';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppErrorBoundary } from './AppErrorBoundary';
import { DataSourceProvider } from './DataSourceProvider';
import { SettingsProvider } from './settings';
import { dashboardDataSource, dashboardQueryClient } from './runtime';

const CityOverviewPage = lazy(() => import('../pages/CityOverviewPage'));
const MonkeyPage = lazy(() => import('../pages/MonkeyPage'));
const StructurePage = lazy(() => import('../pages/StructurePage'));
const OrderHistoryPage = lazy(() => import('../pages/OrderHistoryPage'));
const CrabRecommendationsPage = lazy(() => import('../pages/CrabRecommendationsPage'));
const CrabNotesPage = lazy(() => import('../pages/CrabNotesPage'));
const FixCodePage = lazy(() => import('../pages/FixCodePage'));
const DiaryPage = lazy(() => import('../pages/DiaryPage'));
const ActivityPage = lazy(() => import('../pages/ActivityPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));

function RouteLoader() {
  return <PageState kind="loading" title="Opening city district" message="Loading the route interface." />;
}

export function App() {
  return (
    <AppErrorBoundary>
      <SettingsProvider>
        <QueryClientProvider client={dashboardQueryClient}>
          <DataSourceProvider source={dashboardDataSource}>
            <BrowserRouter>
              <DashboardEventsBridge />
              <Suspense fallback={<RouteLoader />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route element={<AppShell />}>
                    <Route index element={<CityOverviewPage />} />
                    <Route path="monkey" element={<MonkeyPage />} />
                    <Route path="structure" element={<StructurePage />} />
                    <Route path="order-history" element={<OrderHistoryPage />} />
                    <Route path="crab-recommendations" element={<CrabRecommendationsPage />} />
                    <Route path="crab-notes" element={<CrabNotesPage />} />
                    <Route path="fix-code" element={<FixCodePage />} />
                    <Route path="diary" element={<DiaryPage />} />
                    <Route path="activity" element={<ActivityPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </DataSourceProvider>
        </QueryClientProvider>
      </SettingsProvider>
    </AppErrorBoundary>
  );
}

export default App;
