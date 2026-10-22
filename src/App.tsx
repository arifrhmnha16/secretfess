import { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './components/pages/LandingPage';
import { HowItWorksPage } from './components/pages/HowItWorksPage';
import { SubmitPage } from './components/pages/SubmitPage';
import { StatusTrackerPage } from './components/pages/StatusTrackerPage';
import { AdminPage } from './components/pages/AdminPage';
import { submissionService, type LiveSessionStatus } from './services/firebase';
import type { SubmissionType } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'how-it-works' | 'submit' | 'status' | 'admin'>('landing');
  const [submitInitialType, setSubmitInitialType] = useState<SubmissionType>('menfess');
  const [selectedTrackingCode, setSelectedTrackingCode] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<LiveSessionStatus | null>(null);

  const refreshSession = async () => {
    try {
      const s = await submissionService.getSessionStatus();
      setSessionStatus(s);
    } catch {}
  };

  useEffect(() => {
    refreshSession();
    const timer = setInterval(refreshSession, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();

      const isAdminRoute = 
        hash === '#/secret-admin' || 
        hash === '#secret-admin' || 
        hash === '#admin' || 
        hash === '#/admin' ||
        pathname === '/secret-admin' || 
        pathname === '/admin' || 
        params.get('admin') === 'true' || 
        params.get('admin') === 'himase2026' ||
        params.get('panel') === 'admin';

      if (isAdminRoute) {
        setActiveTab('admin');
      }
    };

    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  const handleOpenSubmit = (type: SubmissionType) => {
    setSubmitInitialType(type);
    setActiveTab('submit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateStatus = (code?: string) => {
    if (code) {
      setSelectedTrackingCode(code);
    }
    setActiveTab('status');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#FFAEC8] selection:text-[#2D160E]">
      <div>
        {/* Navigation Bar - Disembunyikan saat di dashboard admin */}
        {activeTab !== 'admin' && (
          <Navbar 
            activeTab={activeTab} 
            setActiveTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
            openSubmitType={handleOpenSubmit}
            isSongfessOpen={sessionStatus?.isOpen ?? true}
          />
        )}

        {/* Main Routed Content */}
        <main>
          {activeTab === 'landing' && (
            <LandingPage 
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              onOpenSubmit={handleOpenSubmit} 
            />
          )}

          {activeTab === 'how-it-works' && (
            <HowItWorksPage 
              onNavigateSubmit={() => handleOpenSubmit('menfess')} 
            />
          )}

          {activeTab === 'submit' && (
            <SubmitPage 
              initialType={submitInitialType} 
              onNavigateStatus={handleNavigateStatus}
              sessionStatus={sessionStatus}
            />
          )}

          {activeTab === 'status' && (
            <StatusTrackerPage 
              initialTrackingCode={selectedTrackingCode} 
            />
          )}

          {activeTab === 'admin' && (
            <AdminPage 
              onBackToHome={() => {
                setActiveTab('landing');
                try {
                  window.history.pushState({}, '', window.location.pathname);
                } catch {
                  // ignore
                }
              }}
              onSessionUpdated={refreshSession}
            />
          )}
        </main>
      </div>

      {/* Global Footer - Disembunyikan saat di dashboard admin */}
      {activeTab !== 'admin' && (
        <Footer 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
        />
      )}
    </div>
  );
}

export default App;
