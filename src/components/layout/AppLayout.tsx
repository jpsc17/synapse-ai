import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FileUploadModal } from '../common/FileUploadModal';
import { DemoNoticeBanner } from '../common/DemoNoticeBanner';
import { useSynapse } from '../../context/SynapseContext';

export const AppLayout: React.FC = () => {
  const { notification, setNotification } = useSynapse();

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans">
      <Sidebar />
      <Header />

      {/* Main viewport offset by Sidebar width (60 = 15rem = 240px) and Header height (14 = 3.5rem = 56px) */}
      <div className="ml-60 pt-14 flex-1 flex flex-col bg-background min-h-screen">
        <div className="p-margin space-y-space-md flex-1">
          <DemoNoticeBanner />
          <Outlet />
        </div>
      </div>

      <FileUploadModal />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary text-on-surface px-4 py-3 rounded-lg shadow-teal-glow flex items-center gap-3 animate-fade-in text-xs font-medium">
          <span className="material-symbols-outlined text-primary text-[20px]">info</span>
          <span>{notification}</span>
          <button 
            onClick={() => setNotification(null)}
            className="text-on-surface-variant hover:text-on-surface ml-2"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
};
