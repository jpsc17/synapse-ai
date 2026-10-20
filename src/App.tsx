import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SynapseProvider } from './context/SynapseContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { PipelinesPage } from './pages/PipelinesPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { QualityPage } from './pages/QualityPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <SynapseProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="overview" element={<Navigate to="/" replace />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="discovery" element={<DiscoveryPage />} />
            <Route path="pipelines" element={<PipelinesPage />} />
            <Route path="datasources" element={<DataSourcesPage />} />
            <Route path="quality" element={<QualityPage />} />
            <Route path="executions" element={<Navigate to="/pipelines" replace />} />
            <Route path="reports" element={<Navigate to="/quality" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SynapseProvider>
    </BrowserRouter>
  );
}

export default App;
