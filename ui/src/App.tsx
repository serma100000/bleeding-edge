import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DashboardPage from '@/pages/DashboardPage';
import AnalysisPage from '@/pages/AnalysisPage';
import ClocksPage from '@/pages/ClocksPage';
import ProofsPage from '@/pages/ProofsPage';
import KnowledgePage from '@/pages/KnowledgePage';
import TrajectoryPage from '@/pages/TrajectoryPage';
import InterventionsPage from '@/pages/InterventionsPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/clocks" element={<ClocksPage />} />
            <Route path="/proofs" element={<ProofsPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/trajectory" element={<TrajectoryPage />} />
            <Route path="/interventions" element={<InterventionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
