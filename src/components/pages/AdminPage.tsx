import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Music, 
  ExternalLink, 
  RefreshCw, 
  Lock, 
  Search, 
  Eye, 
  CheckCircle2, 
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import { submissionService, type LiveSessionStatus } from '../../services/firebase';
import type { Submission, SubmissionStatus } from '../../types';
import { LiveCardPreview } from '../common/LiveCardPreview';
import { InstagramIcon } from '../common/Doodles';

const ADMIN_PASSCODE = 'himase2026';
const ADMIN_SESSION_KEY = 'himase_admin_auth';

interface AdminPageProps {
  onBackToHome: () => void;
  onSessionUpdated?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBackToHome, onSessionUpdated }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === ADMIN_PASSCODE || params.get('passcode') === ADMIN_PASSCODE) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        return true;
      }
    }
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sessionData, setSessionData] = useState<LiveSessionStatus | null>(null);
  const [updatingSession, setUpdatingSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewItem, setPreviewItem] = useState<Submission | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal for setting Instagram URL upon POSTED
  const [postedModalItem, setPostedModalItem] = useState<Submission | null>(null);
  const [instagramUrl, setInstagramUrl] = useState('');

  // Modal for Reject
  const [rejectModalItem, setRejectModalItem] = useState<Submission | null>(null);
  const [rejectReason, setRejectReason] = useState('Melanggar pedoman etika kampus (SARA/Bullying/Privasi)');

  // Modal for Session & Quota Config (replacing browser prompt)
  const [sessionConfigModalOpen, setSessionConfigModalOpen] = useState(false);
  const [modalSessionNumber, setModalSessionNumber] = useState<number>(1);
  const [modalQuotaTotal, setModalQuotaTotal] = useState<number>(50);
  const [modalOperatingHours, setModalOperatingHours] = useState<string>('18:00 – 23:00 WIB');
  const [savingSessionModal, setSavingSessionModal] = useState(false);

  // Generic Editorial Confirmation Modal (replacing browser confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const isLiveDb = submissionService.isLiveFirebase();
  const projectId = submissionService.getFirebaseProjectId();

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await submissionService.getAllSubmissions();
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async () => {
    try {
      const s = await submissionService.getSessionStatus();
      setSessionData(s);
    } catch (err) {
      console.warn('Failed to load session:', err);
    }
  };

  // Initial load & 15-second automatic background refresh
  useEffect(() => {
    if (isAuthenticated) {
      loadSubmissions();
      loadSession();

      const refreshTimer = setInterval(() => {
        loadSubmissions();
        loadSession();
      }, 15000);

      return () => clearInterval(refreshTimer);
    }
  }, [isAuthenticated]);

  // Auto-open visual card preview from URL (e.g. from Telegram "Generate Desain" button link)
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const previewCode = params.get('preview') || params.get('code') || params.get('ticket');
      if (previewCode) {
        submissionService.getSubmissionByCode(previewCode).then((item) => {
          if (item) {
            setPreviewItem(item);
          }
        });
      }
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockoutUntil) {
      const waitSec = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setPasscodeError(`Akses diblokir sementara. Coba lagi dalam ${waitSec} detik.`);
      return;
    }

    if (passcode.trim() === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setPasscodeError('');
      setFailedAttempts(0);
    } else {
      const nextCount = failedAttempts + 1;
      setFailedAttempts(nextCount);
      if (nextCount >= 5) {
        setLockoutUntil(Date.now() + 30000);
        setPasscodeError('Akses diblokir sementara 30 detik (5 kali salah PIN).');
      } else {
        setPasscodeError(`PIN salah (${nextCount}/5 percobaan). Default: himase2026`);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  };

  const handleUpdateStatus = async (
    id: string, 
    status: SubmissionStatus, 
    note?: string, 
    igUrl?: string
  ) => {
    const target = submissions.find(s => s.id === id);
    const trackingCode = target?.trackingCode || id;

    // 1. Optimistic instant local update
    setSubmissions(prev => prev.map(s => s.id === id ? {
      ...s,
      status,
      statusNote: note !== undefined ? note : s.statusNote,
      instagramPostUrl: igUrl !== undefined ? igUrl : s.instagramPostUrl
    } : s));

    // 2. Show instant feedback toast
    setToastMessage(`Status #${trackingCode} berhasil diubah ke [${status}] & data otomatis disegarkan.`);
    setTimeout(() => setToastMessage(null), 4000);

    // 3. Persist to Firestore
    await submissionService.updateSubmissionStatus(id, status, note, igUrl);

    // 4. Fresh re-fetch from database
    await loadSubmissions();
    await loadSession();

    if (previewItem && previewItem.id === id) {
      setPreviewItem(prev => prev ? { ...prev, status, statusNote: note, instagramPostUrl: igUrl } : null);
    }
  };

  const handleDelete = (id: string, code: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Kiriman Permanen',
      message: `Yakin ingin menghapus kiriman #${code} secara permanen dari database? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus',
      isDestructive: true,
      onConfirm: async () => {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        setToastMessage(`Kiriman #${code} berhasil dihapus dari database.`);
        setTimeout(() => setToastMessage(null), 4000);

        await submissionService.deleteSubmission(id);
        await loadSubmissions();
        await loadSession();

        if (previewItem?.id === id) setPreviewItem(null);
      }
    });
  };

  const handleClearCache = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Bersihkan Cache Lokal',
      message: 'Bersihkan cache lokal? Ini akan menghapus data dummy lama yang tersimpan di browser.',
      confirmLabel: 'Bersihkan Cache',
      onConfirm: () => {
        submissionService.clearLocalCache();
        loadSubmissions();
        loadSession();
        setToastMessage('Cache lokal berhasil dibersihkan.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    });
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      s.trackingCode.toLowerCase().includes(term) ||
      s.recipient.toLowerCase().includes(term) ||
      s.senderAlias.toLowerCase().includes(term) ||
      s.message.toLowerCase().includes(term) ||
      (s.songData?.title && s.songData.title.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'PENDING').length,
    designed: submissions.filter(s => s.status === 'DESIGNED').length,
    ready: submissions.filter(s => s.status === 'READY').length,
    posted: submissions.filter(s => s.status === 'POSTED').length,
    rejected: submissions.filter(s => s.status === 'REJECTED').length,
  };

  // 1. Password Screen
  if (!isAuthenticated) {
    return (
      <div className="editorial-container py-16 max-w-md mx-auto">
        <div className="editorial-card p-6 sm:p-8 bg-white space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-[#800020] border border-[#2D160E] flex items-center justify-center mx-auto text-white shadow-[2px_2px_0_#2D160E]">
            <Lock size={22} />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-[#2D160E]">
              Portal Pengurus HIMASE
            </h2>
            <p className="text-xs text-[#6B5347]">
              Masukkan PIN Admin untuk memoderasi pesan & lagu yang masuk.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="input-label text-xs">PIN Admin</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Default: himase2026"
                className="editorial-input text-center text-sm font-mono tracking-widest"
                autoFocus
                required
              />
              {passcodeError && (
                <p className="text-xs text-[#800020] font-bold mt-1.5">{passcodeError}</p>
              )}
            </div>

            <button type="submit" className="w-full btn btn-primary text-xs py-2.5">
              Masuk ke Dashboard
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="text-xs font-bold text-[#6B5347] hover:underline"
            >
              Kembali ke Beranda Publik
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Admin Dashboard
  return (
    <div className="editorial-container py-8 md:py-12 space-y-8">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2D160E]/15">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#2D160E]">
              Dashboard Moderasi Pengurus
            </h1>
            <span className="pill-badge pill-maroon text-[10px] py-0.5 px-2">
              Admin Mode
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#6B5347] mt-1">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLiveDb ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <strong>{isLiveDb ? `Firebase Firestore (${projectId})` : 'Cache Lokal'}</strong>
            </span>
            <span>•</span>
            <span>Total: <strong>{submissions.length}</strong> kiriman</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              loadSubmissions();
              loadSession();
            }}
            disabled={loading}
            className="btn btn-white btn-sm flex items-center gap-1.5 text-xs font-bold"
            title="Refresh Data Sekarang"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleClearCache}
            className="btn btn-white btn-sm flex items-center gap-1.5 text-xs font-bold text-rose-700"
            title="Hapus cache dummy"
          >
            <Trash2 size={13} />
            <span>Reset Cache Dummy</span>
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-white btn-sm text-xs font-bold"
          >
            Keluar Admin
          </button>
        </div>
      </div>

      {/* Floating Instant Feedback Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0_#2D160E] animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Session Quota Manager Bar */}
      {sessionData && (
        <div className="editorial-card p-4 sm:p-5 bg-[#FAF8F5] border border-[#2D160E] shadow-[2.5px_2.5px_0_#2D160E] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sessionData.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <h3 className="text-sm font-black text-[#2D160E]">
                Kontrol Sesi: Sesi #{sessionData.sessionNumber} ({sessionData.isOpen ? 'Status: BUKA' : 'Status: TUTUP'})
              </h3>
            </div>
            <p className="text-xs text-[#6B5347] font-medium">
              Kuota Terisi: <strong className="font-mono text-[#2D160E]">{sessionData.quotaUsed} / {sessionData.quotaTotal}</strong> kiriman Songfess • 
              Sisa Slot: <strong className="font-mono text-[#2D160E]">{sessionData.quotaRemaining}</strong> • 
              Jam: <span className="font-semibold">{sessionData.operatingHours}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={updatingSession}
              onClick={async () => {
                setUpdatingSession(true);
                try {
                  const nextState = !sessionData.isOpen;
                  await submissionService.updateSessionConfig({ isOpen: nextState });
                  await loadSession();
                  onSessionUpdated?.();
                  setToastMessage(`Status Sesi #${sessionData.sessionNumber} berhasil diubah ke: ${nextState ? 'DIBUKA' : 'DITUTUP'}.`);
                  setTimeout(() => setToastMessage(null), 3500);
                } catch (err) {
                  console.error('Failed to toggle session:', err);
                } finally {
                  setUpdatingSession(false);
                }
              }}
              className={`btn btn-sm text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 ${
                sessionData.isOpen 
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300' 
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {updatingSession ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Memproses Sesi...</span>
                </>
              ) : (
                <span>{sessionData.isOpen ? 'Tutup Sesi Songfess' : 'Buka Sesi Songfess'}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setModalSessionNumber(sessionData.sessionNumber || 1);
                setModalQuotaTotal(sessionData.quotaTotal || 50);
                setModalOperatingHours(sessionData.operatingHours || '18:00 – 23:00 WIB');
                setSessionConfigModalOpen(true);
              }}
              className="btn btn-white btn-sm text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 shadow-[1.5px_1.5px_0_#2D160E]"
            >
              <SlidersHorizontal size={12} />
              <span>Atur Sesi & Kuota (Sesi #{sessionData.sessionNumber || 1})</span>
            </button>

            <button
              type="button"
              title="Naikkan ke sesi berikutnya (+1)"
              onClick={() => {
                const nextNum = (sessionData.sessionNumber || 1) + 1;
                setConfirmModal({
                  isOpen: true,
                  title: 'Mulai Sesi Baru',
                  message: `Apakah Anda yakin ingin menaikkan periode ke Sesi #${nextNum}? Nomor sesi di landing page akan langsung berubah ke Sesi #${nextNum}.`,
                  confirmLabel: `Mulai Sesi #${nextNum}`,
                  onConfirm: async () => {
                    await submissionService.updateSessionConfig({ sessionNumber: nextNum });
                    await loadSession();
                    onSessionUpdated?.();
                    setToastMessage(`Sesi berhasil dinaikkan ke: Sesi #${nextNum}.`);
                    setTimeout(() => setToastMessage(null), 3500);
                  }
                });
              }}
              className="btn btn-white btn-sm text-xs font-bold py-1.5 px-2.5 flex items-center gap-1 shadow-[1.5px_1.5px_0_#2D160E]"
            >
              <span>+1 Sesi</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'ALL', label: 'Semua', count: counts.all, bg: 'bg-white' },
          { key: 'PENDING', label: 'Pending', count: counts.pending, bg: 'bg-amber-50 text-amber-900 border-amber-300' },
          { key: 'DESIGNED', label: 'Designed', count: counts.designed, bg: 'bg-purple-50 text-purple-900 border-purple-300' },
          { key: 'READY', label: 'Ready', count: counts.ready, bg: 'bg-blue-50 text-blue-900 border-blue-300' },
          { key: 'POSTED', label: 'Posted', count: counts.posted, bg: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
          { key: 'REJECTED', label: 'Rejected', count: counts.rejected, bg: 'bg-rose-50 text-rose-900 border-rose-300' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilterStatus(item.key as any)}
            className={`p-3 rounded-xl border border-[#2D160E] text-left transition-all ${
              filterStatus === item.key 
                ? 'shadow-[2.5px_2.5px_0_#2D160E] ring-2 ring-[#2D160E]' 
                : 'opacity-85 hover:opacity-100'
            } ${item.bg}`}
          >
            <p className="text-[10px] uppercase font-bold tracking-wider">{item.label}</p>
            <p className="text-xl font-black mt-0.5">{item.count}</p>
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div className="p-2 rounded-xl bg-white border border-[#2D160E] flex items-center gap-2 max-w-md">
        <Search size={16} className="text-[#6B5347] ml-2 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari kode tiket, penerima, pesan, lagu..."
          className="w-full bg-transparent border-none outline-none text-xs font-bold text-[#2D160E] placeholder:text-gray-400"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-xs font-bold text-gray-400 mr-2">
            Clear
          </button>
        )}
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className="editorial-card p-10 text-center bg-white space-y-2">
            <p className="font-hand text-lg text-[#6B5347]">
              Tidak ada kiriman yang sesuai.
            </p>
            <p className="text-xs text-[#9A8077]">
              {submissions.length === 0 
                ? 'Belum ada data masuk di database Firestore. Coba kirimkan pesan baru di halaman Submit!' 
                : 'Coba ubah filter status atau kata kunci pencarian.'}
            </p>
          </div>
        ) : (
          filteredSubmissions.map((sub) => (
            <div 
              key={sub.id}
              className="editorial-card p-5 bg-white space-y-4 transition-all hover:border-[#800020]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2D160E]/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-[#800020]/15 border border-[#800020]/30 text-[#800020]">
                    #{sub.trackingCode}
                  </span>

                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    sub.type === 'songfess' ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-[#800020]/15 text-[#800020] border-[#800020]/30'
                  }`}>
                    {sub.type}
                  </span>

                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    sub.status === 'PENDING' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                    sub.status === 'DESIGNED' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                    sub.status === 'READY' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                    sub.status === 'POSTED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                    'bg-rose-100 text-rose-900 border-rose-300'
                  }`}>
                    {sub.status}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-[#6B5347]">
                  {new Date(sub.createdAt).toLocaleString('id-ID', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })} WIB
                </div>
              </div>

              {/* Target & Sender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <p>
                  <strong className="text-[#6B5347]">Untuk:</strong>{' '}
                  <span className="font-extrabold text-[#2D160E]">{sub.recipient}</span>
                </p>
                <p>
                  <strong className="text-[#6B5347]">Dari:</strong>{' '}
                  <span className="font-extrabold text-[#2D160E]">
                    {sub.isAnonymous ? 'Anonim (100% Rahasia)' : sub.senderAlias}
                  </span>
                </p>
              </div>

              {/* Song Details if Songfess */}
              {sub.songData && (
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/20 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Music size={14} className="text-[#800020] shrink-0" />
                    <span className="font-black text-[#2D160E]">{sub.songData.title}</span>
                    <span className="text-[#6B5347]">— {sub.songData.artist}</span>
                    {sub.songData.favoriteTimestamp && (
                      <span className="ml-auto font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-[#2D160E]/20">
                        {sub.songData.favoriteTimestamp}
                      </span>
                    )}
                  </div>
                  {sub.songData.favoriteLyric && (
                    <p className="italic text-[#6B5347] text-[11px]">
                      "{sub.songData.favoriteLyric}"
                    </p>
                  )}
                  {sub.songData.spotifyUrl && (
                    <a 
                      href={sub.songData.spotifyUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] text-[#1DB954] font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Buka di Spotify</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}

              {/* Message */}
              {sub.type === 'menfess' && (
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/15 text-xs text-[#2D160E] font-medium leading-relaxed">
                  "{sub.message}"
                </div>
              )}

              {/* Note / IG Link */}
              {sub.statusNote && (
                <p className="text-[11px] text-[#6B5347]">
                  <strong>Catatan Kurasi:</strong> {sub.statusNote}
                </p>
              )}
              {sub.instagramPostUrl && (
                <a 
                  href={sub.instagramPostUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-[#800020] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <InstagramIcon size={12} />
                  <span>Lihat Tayangan di Instagram Story / Feed</span>
                  <ExternalLink size={11} />
                </a>
              )}

              {/* Action Buttons Toolbar */}
              <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {sub.status !== 'DESIGNED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(sub.id, 'DESIGNED', 'Pesan disetujui, kartu editorial sedang disiapkan.')}
                      className="btn btn-white btn-sm text-[11px] font-bold py-1 px-2.5 hover:bg-purple-50 text-purple-900 border-purple-300"
                    >
                      Tandai Designed
                    </button>
                  )}

                  {sub.status !== 'READY' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(sub.id, 'READY', 'Kartu visual selesai dibuat. Menunggu jadwal sesi posting.')}
                      className="btn btn-white btn-sm text-[11px] font-bold py-1 px-2.5 hover:bg-blue-50 text-blue-900 border-blue-300"
                    >
                      Siap Tayang (Ready)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPostedModalItem(sub);
                      setInstagramUrl(sub.instagramPostUrl || 'https://instagram.com/se.cretfess');
                    }}
                    className="btn btn-white btn-sm text-[11px] font-bold py-1 px-2.5 hover:bg-emerald-50 text-emerald-900 border-emerald-300"
                  >
                    Sudah Tayang (Posted)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalItem(sub);
                      setRejectReason('Melanggar pedoman etika kampus (SARA/Bullying/Privasi)');
                    }}
                    className="btn btn-white btn-sm text-[11px] font-bold py-1 px-2.5 hover:bg-rose-50 text-rose-900 border-rose-300"
                  >
                    Tolak (Reject)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewItem(sub)}
                    className="btn btn-white btn-sm text-[11px] font-bold py-1 px-2.5"
                  >
                    <Eye size={11} className="inline mr-1" />
                    Preview Visual
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(sub.id, sub.trackingCode)}
                  className="p-1.5 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 transition-colors ml-auto"
                  title="Hapus Kiriman"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Set as Posted (Instagram URL) */}
      {postedModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="editorial-card p-6 bg-white max-w-md w-full space-y-4 shadow-[6px_6px_0_#2D160E]">
            <h3 className="text-base font-black text-[#2D160E]">
              Tandai Sudah Tayang di Instagram
            </h3>
            <p className="text-xs text-[#6B5347]">
              Masukkan link Instagram Story / Post untuk tiket #{postedModalItem.trackingCode}:
            </p>
            <input
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="editorial-input text-xs"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostedModalItem(null)}
                className="btn btn-white text-xs py-1.5 px-3"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateStatus(
                    postedModalItem.id, 
                    'POSTED', 
                    'Telah diposting ke Instagram @se.cretfess!', 
                    instagramUrl.trim()
                  );
                  setPostedModalItem(null);
                }}
                className="btn btn-primary text-xs py-1.5 px-4"
              >
                Simpan & Tandai Posted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject with reason */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="editorial-card p-6 bg-white max-w-md w-full space-y-4 shadow-[6px_6px_0_#2D160E]">
            <h3 className="text-base font-black text-[#2D160E] text-rose-800">
              Tolak Kiriman #{rejectModalItem.trackingCode}
            </h3>
            <p className="text-xs text-[#6B5347]">
              Pilih atau tuliskan alasan penolakan (akan ditampilkan saat pengirim mengecek kode tiket):
            </p>
            <div className="space-y-1.5 text-xs">
              {[
                'Melanggar pedoman etika kampus (SARA/Bullying/Privasi)',
                'Doxxing data pribadi (no telepon/plat nomor/identitas privat)',
                'Spam atau pesan pengulangan berulang kali',
                'Lagu tidak sesuai atau lirik mengandung unsur destruktif'
              ].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRejectReason(r)}
                  className={`w-full text-left p-2 rounded-lg border text-[11px] font-bold ${
                    rejectReason === r ? 'bg-rose-50 border-rose-400 text-rose-900' : 'bg-white border-[#2D160E]/20 text-[#6B5347]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="editorial-textarea text-xs h-20"
              placeholder="Tulis alasan khusus..."
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="btn btn-white text-xs py-1.5 px-3"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateStatus(
                    rejectModalItem.id, 
                    'REJECTED', 
                    `Ditolak: ${rejectReason.trim()}`
                  );
                  setRejectModalItem(null);
                }}
                className="btn btn-primary text-xs py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white border-rose-900"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Preview Card */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="editorial-card p-6 bg-white max-w-sm w-full space-y-4 shadow-[6px_6px_0_#2D160E] relative">
            <div className="flex items-center justify-between pb-2 border-b border-[#2D160E]/15">
              <h3 className="text-xs uppercase font-mono font-bold text-[#2D160E]">
                Visual Kartu Story #{previewItem.trackingCode}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="text-xs font-bold px-2 py-0.5 rounded border border-[#2D160E] hover:bg-[#800020] hover:text-white"
              >
                Tutup
              </button>
            </div>

            <LiveCardPreview
              type={previewItem.type}
              recipient={previewItem.recipient}
              senderAlias={previewItem.senderAlias}
              isAnonymous={previewItem.isAnonymous}
              category={previewItem.category}
              message={previewItem.message}
              theme={previewItem.theme}
              songData={previewItem.songData}
              trackingCode={previewItem.trackingCode}
              onThemeChange={(newTheme) => {
                setPreviewItem({ ...previewItem, theme: newTheme });
              }}
            />
          </div>
        </div>
      )}

      {/* Modal: Atur Sesi & Kuota (Pengganti prompt browser bawaan) */}
      {sessionConfigModalOpen && sessionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="editorial-card p-6 bg-white max-w-md w-full space-y-5 shadow-[6px_6px_0_#2D160E] relative border-2 border-[#2D160E]">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D160E]/15">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#800020]" />
                <h3 className="text-sm font-black text-[#2D160E] uppercase tracking-wide">
                  Atur Sesi & Kuota Songfess
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSessionConfigModalOpen(false)}
                className="text-xs font-bold px-2 py-0.5 rounded border border-[#2D160E] hover:bg-[#800020] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium text-[#2D160E]">
              {/* Nomor Sesi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold">Nomor Sesi:</label>
                  <button
                    type="button"
                    onClick={() => setModalSessionNumber(prev => prev + 1)}
                    className="text-[10px] text-[#800020] hover:underline font-bold"
                  >
                    +1 Sesi Berikutnya
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 bg-[#FAF8F5] border border-[#2D160E] rounded-lg font-mono font-bold text-xs">
                    Sesi #
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={modalSessionNumber}
                    onChange={(e) => setModalSessionNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    className="editorial-input text-xs font-bold w-full"
                    placeholder="1"
                  />
                </div>
                <p className="text-[11px] text-[#6B5347]">
                  Nomor urut sesi yang tampil di landing page dan tiket.
                </p>
              </div>

              {/* Maksimal Kuota */}
              <div className="space-y-1.5">
                <label className="font-bold">Maksimal Kuota Pengiriman:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={modalQuotaTotal}
                    onChange={(e) => setModalQuotaTotal(Math.max(1, parseInt(e.target.value) || 1))}
                    className="editorial-input text-xs font-bold w-full"
                    placeholder="50"
                  />
                  <span className="text-xs font-bold text-[#6B5347] shrink-0">Kiriman</span>
                </div>
              </div>

              {/* Jam Operasional */}
              <div className="space-y-1.5">
                <label className="font-bold">Jam Buka Pengiriman:</label>
                <input
                  type="text"
                  value={modalOperatingHours}
                  onChange={(e) => setModalOperatingHours(e.target.value)}
                  className="editorial-input text-xs font-bold w-full"
                  placeholder="18:00 – 23:00 WIB"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2D160E]/15">
              <button
                type="button"
                onClick={() => setSessionConfigModalOpen(false)}
                className="btn btn-white text-xs py-1.5 px-3"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingSessionModal}
                onClick={async () => {
                  setSavingSessionModal(true);
                  try {
                    await submissionService.updateSessionConfig({
                      sessionNumber: modalSessionNumber,
                      quotaTotal: modalQuotaTotal,
                      operatingHours: modalOperatingHours
                    });
                    await loadSession();
                    onSessionUpdated?.();
                    setSessionConfigModalOpen(false);
                    setToastMessage(`Pengaturan Sesi #${modalSessionNumber} berhasil disimpan.`);
                    setTimeout(() => setToastMessage(null), 3500);
                  } catch (err) {
                    console.error('Failed to save session modal:', err);
                  } finally {
                    setSavingSessionModal(false);
                  }
                }}
                className="btn btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
              >
                {savingSessionModal && <Loader2 size={12} className="animate-spin" />}
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editorial Custom Confirmation Modal (Pengganti confirm browser bawaan) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="editorial-card p-6 bg-white max-w-sm w-full space-y-4 shadow-[6px_6px_0_#2D160E] relative border-2 border-[#2D160E]">
            <h3 className={`text-sm font-black ${confirmModal.isDestructive ? 'text-rose-700' : 'text-[#2D160E]'}`}>
              {confirmModal.title}
            </h3>
            <p className="text-xs text-[#6B5347] leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2D160E]/15">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="btn btn-white text-xs py-1.5 px-3"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  action();
                }}
                className={`btn text-xs py-1.5 px-4 font-bold ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-900 shadow-[2px_2px_0_#2D160E]'
                    : 'btn-primary'
                }`}
              >
                {confirmModal.confirmLabel || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
