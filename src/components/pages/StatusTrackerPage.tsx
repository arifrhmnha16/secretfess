import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Radio, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { submissionService } from '../../services/firebase';
import type { Submission } from '../../types';
import { InstagramIcon } from '../common/Doodles';

interface StatusTrackerPageProps {
  initialTrackingCode?: string;
}

export const StatusTrackerPage: React.FC<StatusTrackerPageProps> = ({ 
  initialTrackingCode = '' 
}) => {
  const [searchInput, setSearchInput] = useState(initialTrackingCode);
  const [currentResult, setCurrentResult] = useState<Submission | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTrackingCode) {
      setSearchInput(initialTrackingCode);
      handleSearch(initialTrackingCode);
    }
  }, [initialTrackingCode]);

  const handleSearch = async (codeToSearch?: string) => {
    const code = (codeToSearch || searchInput).trim();
    if (!code) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await submissionService.getSubmissionByCode(code);
      setCurrentResult(res);
    } catch (err) {
      console.error('Search error:', err);
      setCurrentResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'PENDING — Menunggu Review',
          className: 'bg-amber-50 text-amber-800 border-amber-300',
          desc: 'Pesanmu sedang diperiksa oleh tim pengurus HIMASE melalui bot Telegram.'
        };
      case 'DESIGNED':
        return {
          label: 'DESIGNED — Kartu Selesai Dibuat',
          className: 'bg-purple-50 text-purple-800 border-purple-300',
          desc: 'Pesan lolos sensor! Desain kartu editorial telah selesai digenerate.'
        };
      case 'READY':
        return {
          label: 'READY — Siap Tayang',
          className: 'bg-blue-50 text-blue-800 border-blue-300',
          desc: 'Kartu visual masuk antrean jadwal posting Instagram story sesi malam ini.'
        };
      case 'POSTED':
        return {
          label: 'POSTED — Sudah Tayang di Instagram',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          desc: 'Sudah dipublikasikan ke Story / Feed @se.cretfess! Cek sekarang di Instagram.'
        };
      case 'REJECTED':
        return {
          label: 'REJECTED — Ditolak',
          className: 'bg-rose-50 text-rose-800 border-rose-300',
          desc: 'Pesan tidak dapat dipublikasikan karena melanggar ketentuan rules komunitas.'
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800 border-gray-300',
          desc: ''
        };
    }
  };

  return (
    <div className="editorial-container py-10 md:py-16 space-y-10 md:space-y-14">
      
      {/* 1. Header & Search Bar */}
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <div className="pill-badge pill-maroon text-xs">
          Pelacak Status Tiket
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#2D160E] tracking-tight">
          Lacak Perjalanan{' '}
          <span className="highlight-maroon-box">
            Pesanmu
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-[#6B5347] font-medium leading-relaxed">
          Masukkan kode tiket yang kamu peroleh saat mengirim pesan untuk memantau status secara langsung.
        </p>

        {/* Search Input Box */}
        <div className="pt-3 max-w-md mx-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-[#2D160E] shadow-[3px_3px_0_#2D160E]"
          >
            <div className="pl-3 text-[#6B5347]">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ketik kode tiket... (contoh: SF-2026-XXXX)"
              className="w-full bg-transparent border-none outline-none font-bold text-xs sm:text-sm text-[#2D160E] placeholder:text-gray-400 uppercase font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-sm py-1.5 px-4 shrink-0 text-xs"
            >
              {loading ? 'Mencari...' : 'Lacak'}
            </button>
          </form>
        </div>
      </div>

      {/* 2. Structured Result Section */}
      {currentResult ? (
        <div className="space-y-8">
          
          {/* Status Summary Banner */}
          <div className="editorial-card p-5 sm:p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold text-[#800020] uppercase tracking-wider">
                Kode Pelacakan Resmi
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#2D160E] font-mono">
                #{currentResult.trackingCode}
              </h2>
            </div>

            <div className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold self-start sm:self-auto ${getStatusBadge(currentResult.status).className}`}>
              {getStatusBadge(currentResult.status).label}
            </div>
          </div>

          {/* Stepper Timeline Section */}
          {currentResult.status !== 'REJECTED' ? (
            <div className="editorial-card p-5 sm:p-6 bg-[#FAF8F5] space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-extrabold text-[#2D160E]">
                Progres Moderasi & Penerbitan:
              </h4>

              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                {[
                  { label: 'Terkirim', active: true },
                  { label: 'Review Pengurus', active: ['DESIGNED', 'READY', 'POSTED'].includes(currentResult.status) },
                  { label: 'Siap Publish', active: ['READY', 'POSTED'].includes(currentResult.status) },
                  { label: 'Tayang di IG', active: currentResult.status === 'POSTED' }
                ].map((step, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className={`h-2 rounded-full border border-[#2D160E] ${
                      step.active ? 'bg-[#800020]' : 'bg-gray-200'
                    }`} />
                    <p className={`text-[10px] sm:text-xs font-bold ${
                      step.active ? 'text-[#2D160E]' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="editorial-card p-5 bg-rose-50 border-rose-300 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <ShieldAlert size={16} />
                <span>Kiriman Tidak Diloloskan Pengurus</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed font-medium">
                {currentResult.statusNote || 'Kiriman tidak memenuhi standar etika kampus atau aturan privasi.'}
              </p>
            </div>
          )}

          {/* Details & Information (Clean Full-Width, No Live Preview) */}
          <div className="editorial-card p-6 sm:p-8 bg-white space-y-5">
            
            {/* Admin Note Box */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#2D160E] space-y-1.5">
              <p className="text-[11px] font-bold text-[#6B5347] uppercase tracking-wider">
                Catatan Pengurus HIMASE:
              </p>
              <p className="text-xs sm:text-sm font-semibold text-[#2D160E] leading-relaxed">
                {currentResult.statusNote || getStatusBadge(currentResult.status).desc}
              </p>

              {currentResult.status === 'POSTED' && currentResult.instagramPostUrl && (
                <div className="pt-2">
                  <a
                    href={currentResult.instagramPostUrl || "https://instagram.com/se.cretfess"}
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-maroon btn-sm flex items-center gap-1.5 text-xs font-bold"
                  >
                    <InstagramIcon size={13} />
                    <span>Lihat di Instagram Story @se.cretfess</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Message Details */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6B5347] uppercase tracking-wider">
                Isi Pesan:
              </label>
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/20 text-xs sm:text-sm font-medium text-[#2D160E] leading-relaxed">
                "{currentResult.message}"
              </div>
            </div>

            {/* Metadata Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/15 space-y-0.5">
                <span className="font-bold text-[#6B5347]">Penerima:</span>
                <p className="font-extrabold text-[#2D160E] truncate">{currentResult.recipient}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/15 space-y-0.5">
                <span className="font-bold text-[#6B5347]">Pengirim:</span>
                <p className="font-extrabold text-[#2D160E] truncate">
                  {currentResult.isAnonymous ? 'Anonim' : currentResult.senderAlias}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/15 space-y-0.5">
                <span className="font-bold text-[#6B5347]">Tipe Pesan:</span>
                <p className="font-extrabold text-[#2D160E] uppercase tracking-wide">
                  {currentResult.type}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/15 space-y-0.5">
                <span className="font-bold text-[#6B5347]">Waktu Kirim:</span>
                <p className="font-extrabold text-[#2D160E]">
                  {new Date(currentResult.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </p>
              </div>
            </div>

          </div>

        </div>
      ) : hasSearched && !loading ? (
        <div className="editorial-card p-8 bg-white text-center max-w-md mx-auto space-y-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-[#2D160E] flex items-center justify-center mx-auto text-rose-700 font-bold text-sm">
            !
          </div>
          <h3 className="text-lg font-black text-[#2D160E]">
            Kode Tiket Tidak Ditemukan
          </h3>
          <p className="text-xs text-[#6B5347] leading-relaxed">
            Periksa kembali penulisan kode tiketmu, atau gunakan tombol uji coba cepat di atas.
          </p>
        </div>
      ) : null}

      {/* 3. Session Information Card */}
      <div className="editorial-card p-6 md:p-8 bg-[#FAF8F5] space-y-3">
        <div className="flex items-center gap-2">
          <span className="pill-badge pill-matcha text-xs">
            <Radio size={12} className="text-[#2D5A34]" />
            Informasi Sesi Songfess
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          <div className="space-y-0.5">
            <h4 className="text-[11px] uppercase font-extrabold text-[#6B5347]">Jadwal Operasional</h4>
            <p className="text-sm font-extrabold text-[#2D160E]">Setiap Malam: 18:00 – 23:00 WIB</p>
            <p className="text-xs text-[#6B5347]">Waktu aktif pengurus memproses antrean kartu.</p>
          </div>

          <div className="space-y-0.5">
            <h4 className="text-[11px] uppercase font-extrabold text-[#6B5347]">Kuota Harian</h4>
            <p className="text-sm font-extrabold text-[#2D160E]">Maksimal 50 Kiriman / Sesi</p>
            <p className="text-xs text-[#6B5347]">Dibatasi demi menjaga kualitas visual Instagram.</p>
          </div>

          <div className="space-y-0.5">
            <h4 className="text-[11px] uppercase font-extrabold text-[#6B5347]">Kanal Publikasi</h4>
            <p className="text-sm font-extrabold text-[#2D160E]">Instagram @se.cretfess</p>
            <p className="text-xs text-[#6B5347]">Story & Feed Highlight terorganisir.</p>
          </div>
        </div>
      </div>

    </div>
  );
};
