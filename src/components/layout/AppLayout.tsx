import { Icon } from '../common/Icon';
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FileUploadModal } from '../common/FileUploadModal';
import { DemoNoticeBanner } from '../common/DemoNoticeBanner';
import { useSynapse } from '../../context/SynapseContext';

export const AppLayout: React.FC = () => {
  const { notification, setNotification } = useSynapse();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans">
      <Sidebar mobileOpen={mobileNavigationOpen} onNavigate={() => setMobileNavigationOpen(false)} />
      {mobileNavigationOpen && <button aria-label="Fechar navegação" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileNavigationOpen(false)} />}
      <Header onMenu={() => setMobileNavigationOpen(true)} />

      {/* Main viewport offset by Sidebar width (60 = 15rem = 240px) and Header height (14 = 3.5rem = 56px) */}
      <div className="min-h-screen flex-1 bg-background pt-14 md:ml-60">
        <div className="flex-1 space-y-space-md p-margin-mobile md:p-margin">
          <DemoNoticeBanner />
          <Outlet />
        </div>
      </div>

      <FileUploadModal />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-primary bg-surface-container-high px-4 py-3 text-xs font-medium text-on-surface shadow-teal-glow animate-fade-in md:bottom-6 md:left-auto md:right-6 md:max-w-2xl">
          <Icon name="info" className="text-primary text-[20px]" />
          <span>{notification}</span>
          <button 
            onClick={() => setNotification(null)}
            className="text-on-surface-variant hover:text-on-surface ml-2"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      )}
    </div>
  );
};
