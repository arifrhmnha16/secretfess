import React, { useEffect, useState } from 'react';
import { Send, Music, ArrowRight, CheckCircle2, Radio, Mail, Sparkles } from 'lucide-react';
import { 
  PeaceDoodle, 
  PencilDoodle, 
  SparkleCluster, 
  VinylDoodle,
  EnvelopeDoodle
} from '../common/Doodles';
import { submissionService, type LiveSessionStatus } from '../../services/firebase';
import type { Submission } from '../../types';

interface LandingPageProps {
  onNavigate: (tab: 'landing' | 'how-it-works' | 'submit' | 'status') => void;
  onOpenSubmit: (type: 'menfess' | 'songfess') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenSubmit }) => {
  const [highlights, setHighlights] = useState<Submission[]>([]);
  const [session, setSession] = useState<LiveSessionStatus | null>(null);

  useEffect(() => {
    submissionService.getRecentHighlights().then(data => setHighlights(data));
    submissionService.getSessionStatus().then(data => setSession(data));
  }, []);

  return (
    <div className="editorial-container">
      
      {/* ========================================================
          1. HERO SECTION (Airy, Elegant, Maddie Leigh Inspired)
      ======================================================== */}
      <section className="pt-10 pb-14 md:pt-16 md:pb-20 text-center max-w-3xl mx-auto">
        {/* Editorial Headline */}
        <div className="space-y-3 mb-6">
          <p className="font-hand text-xl md:text-2xl text-[#6B5347]">
            Punya pesan rahasia yang belum tersampaikan?
          </p>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#2D160E] tracking-tight leading-[1.2]">
            Saatnya{' '}
            <span className="inline-flex items-center">
              <span className="highlight-maroon-box inline-block my-1">
                Kirimkan
              </span>
              <PencilDoodle size={30} className="inline-block ml-1 opacity-80" />
            </span>{' '}
            <br className="hidden sm:inline" />
            rasamu tanpa cemas!
            <PeaceDoodle size={28} className="inline-block ml-2 opacity-80" />
          </h1>
        </div>

        {/* Editorial Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-[#6B5347] max-w-xl mx-auto mb-8 font-medium leading-relaxed">
          Platform Menfess dan Songfess anonim resmi HIMASE. Sampaikan kekaguman, apresiasi, 
          dan lagu favoritmu. Dicurasi pengurus & diposting ke Instagram story!
        </p>

        {/* CTA Button Cluster */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-7">
          <button
            onClick={() => onOpenSubmit('menfess')}
            className="w-full sm:w-auto btn btn-primary btn-capsule text-sm sm:text-base py-3 px-7 flex items-center justify-center gap-2"
          >
            <Send size={16} />
            <span>Kirim Menfess Anonim</span>
          </button>

          <button
            onClick={() => onOpenSubmit('songfess')}
            className="w-full sm:w-auto btn btn-maroon btn-capsule text-sm sm:text-base py-3 px-7 flex items-center justify-center gap-2"
          >
            <Music size={16} />
            <span>Kirim Songfess Musik</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-bold text-[#6B5347]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-[#10B981]" />
            100% Bebas Login
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-[#10B981]" />
            Anti-Doxxing & Human Moderated
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-[#10B981]" />
            Estetik Siap Instagram
          </span>
        </div>
      </section>

      {/* ========================================================
          2. DUAL ACTION CARDS (Menfess vs Songfess)
      ======================================================== */}
      <section className="mb-16 md:mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          
          {/* Card 1: Menfess */}
          <div 
            onClick={() => onOpenSubmit('menfess')}
            className="editorial-card editorial-card-interactive p-6 sm:p-8 flex flex-col justify-between bg-white group"
          >
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="pill-badge pill-maroon text-xs inline-flex items-center gap-1.5">
                  <Mail size={13} />
                  <span>Mode Menfess • Buka 24 Jam</span>
                </span>
                <EnvelopeDoodle size={32} />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#2D160E] leading-snug">
                Curahkan Pesan & Rahasiamu
              </h2>

              <p className="text-xs sm:text-sm text-[#6B5347] leading-relaxed">
                Punya secret crush di kelas? Mau berterima kasih ke dosen pembimbing, kakak tingkat, atau teman satu kelompok tugas akhir? 
                Kirim pesan kapan saja tanpa batas waktu.
              </p>
            </div>

            <div className="pt-4 border-t border-[#2D160E]/15 flex items-center justify-between text-xs font-bold">
              <span className="text-[#2D160E] group-hover:underline flex items-center gap-1.5">
                <span>Tulis Menfess Sekarang</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="font-mono text-[#9A8077]">24 Jam Aktif</span>
            </div>
          </div>

          {/* Card 2: Songfess */}
          <div 
            onClick={() => onOpenSubmit('songfess')}
            className="editorial-card editorial-card-interactive p-6 sm:p-8 flex flex-col justify-between bg-[#FAF8FC] group"
          >
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                {session?.isOpen ? (
                  <span className="pill-badge text-xs inline-flex items-center gap-1.5 !bg-emerald-50 !text-emerald-950 border-emerald-400 shadow-[1.5px_1.5px_0_#2D160E] font-bold">
                    <Music size={13} className="text-emerald-700" />
                    <span>Mode Songfess • Sesi Dibuka</span>
                  </span>
                ) : (
                  <span className="pill-badge text-xs inline-flex items-center gap-1.5 !bg-rose-50 !text-rose-950 border-rose-300 shadow-[1.5px_1.5px_0_#2D160E] font-bold">
                    <Music size={13} className="text-rose-700" />
                    <span>Mode Songfess • Ditutup</span>
                  </span>
                )}
                <VinylDoodle size={32} />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#2D160E] leading-snug">
                Kirim Lagu yang Mewakili Rasamu
              </h2>

              <p className="text-xs sm:text-sm text-[#6B5347] leading-relaxed">
                Kadang kata-kata tak cukup. Cari lagu via YouTube, pilih potongan 10–30 detik favoritmu, 
                dan kirimkan ke si dia. Sesi dibuka berkala oleh tim kurasi pengurus HIMASE!
              </p>
            </div>

            <div className="pt-4 border-t border-[#2D160E]/15 flex items-center justify-between text-xs font-bold">
              <span className="text-[#2D160E] group-hover:underline flex items-center gap-1.5">
                <span>{session?.isOpen ? 'Pilih Lagu YouTube' : 'Pantau Instagram @se.cretfess'}</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="font-mono text-[#9A8077]">{session?.isOpen ? 'YouTube v3 API' : 'Sesi Tertutup'}</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          3. SESI SONGFESS AKTIF & QUOTA TICKER
      ======================================================== */}
      <section className="mb-16 md:mb-24">
        <div className="editorial-card p-6 md:p-8 bg-[#FEEAA1]/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="pill-badge pill-white text-xs text-[#2D160E]">
                  <Radio size={13} className="text-[#800020]" />
                  Status Kuota Sesi
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-[#2D160E] shadow-[1.5px_1.5px_0_#2D160E] ${
                  session?.isOpen ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${session?.isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                  Sesi #{session?.sessionNumber || 1} • {session?.isOpen ? 'Aktif' : 'Tutup'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[#2D160E]">
                Jam Buka Pengiriman: {session?.operatingHours || '18:00 – 23:00 WIB'}
              </h3>
              <p className="text-xs sm:text-sm text-[#2D160E]/85 leading-relaxed font-medium">
                {session?.announcement || 'Setiap malam, pengurus HIMASE mengkurasi kiriman terbaik untuk di-generate menjadi kartu Instagram story edisi eksklusif.'}
              </p>
            </div>

            {/* Quota Progress Meter */}
            <div className="w-full md:w-72 bg-white p-4 rounded-xl border border-[#2D160E] shadow-[2px_2px_0_#2D160E] space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-[#2D160E]">
                <span>Kuota Terisi:</span>
                <span className="font-mono">
                  {session ? `${session.quotaUsed} / ${session.quotaTotal}` : '...'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#FAF8F5] rounded-full border border-[#2D160E] overflow-hidden">
                <div 
                  className="h-full bg-[#800020] rounded-full transition-all duration-500"
                  style={{ 
                    width: session ? `${Math.min(100, Math.round((session.quotaUsed / session.quotaTotal) * 100))}%` : '0%' 
                  }}
                />
              </div>
              <p className="text-[11px] font-semibold text-[#6B5347] text-right">
                {session ? `Tersisa ${session.quotaRemaining} slot malam ini` : 'Menghitung sisa kuota...'}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          4. RECENT APPROVED HIGHLIGHTS
      ======================================================== */}
      <section className="mb-16 md:mb-24 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="pill-badge pill-maroon text-xs inline-flex items-center gap-1.5">
              <Sparkles size={12} />
              <span>Dapur Editorial</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#2D160E]">
              Cerita yang Baru Saja Terbit
            </h2>
            <p className="text-xs sm:text-sm text-[#6B5347]">
              Contoh Menfess dan Songfess yang telah lolos kurasi pengurus dan diposting.
            </p>
          </div>

          <button
            onClick={() => onNavigate('status')}
            className="btn btn-white btn-sm self-start sm:self-auto"
          >
            Lacak Kirimanmu
          </button>
        </div>

        {highlights.length === 0 ? (
          <div className="editorial-card p-8 text-center bg-white space-y-3">
            <p className="font-hand text-lg text-[#6B5347]">
              Belum ada kiriman yang terbit hari ini.
            </p>
            <p className="text-xs text-[#9A8077] max-w-sm mx-auto">
              Jadilah yang pertama mengirimkan Menfess atau Songfess ke ruang kampus HIMASE!
            </p>
            <button
              onClick={() => onOpenSubmit('menfess')}
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5 text-xs font-bold"
            >
              <Send size={13} />
              <span>Kirim Cerita Pertama</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {highlights.map((item) => (
              <div 
                key={item.id}
                className="editorial-card p-5 sm:p-6 flex flex-col justify-between space-y-3 bg-white"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold bg-[#800020]/15 px-2 py-0.5 rounded-md border border-[#800020]/30 text-[#800020]">
                      #{item.trackingCode}
                    </span>
                    <span className="text-xs font-bold text-[#10B981] flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {item.status}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-[#6B5347]">
                    Untuk: <strong className="text-[#2D160E]">{item.recipient}</strong>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-[#2D160E] leading-relaxed line-clamp-3">
                    "{item.message}"
                  </p>

                  {item.songData && (
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#2D160E]/15 text-xs flex items-center gap-2">
                      <Music size={13} className="text-[#800020] shrink-0" />
                      <span className="font-extrabold text-[#2D160E] truncate">
                        {item.songData.title}
                      </span>
                      <span className="text-[#6B5347] truncate text-[11px]">— {item.songData.artist}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#2D160E]/10 flex items-center justify-between text-xs text-[#6B5347]">
                  <span>Dari: <strong>{item.isAnonymous ? 'Anonim' : item.senderAlias}</strong></span>
                  <span className="text-[11px] font-mono text-[#9A8077]">IG Story</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================
          5. 3 PILLARS / BENEFITS
      ======================================================== */}
      <section className="mb-16 md:mb-24">
        <div className="editorial-card p-6 sm:p-10 bg-white space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="pill-badge pill-white text-xs text-[#2D160E]">
              Kenapa Memilih Kami?
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#2D160E]">
              Dirancang untuk Mahasiswa, Dijaga dengan Hati.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#2D160E] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#800020] border border-[#2D160E] flex items-center justify-center font-black text-sm text-white">
                1
              </div>
              <h4 className="text-base font-black text-[#2D160E]">100% Identitas Terlindungi</h4>
              <p className="text-xs text-[#6B5347] leading-relaxed">
                Kami tidak melacak akun media sosial, nomor telepon, ataupun data sensitif pengirim. Kerahasiaanmu terjamin aman.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#2D160E] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#D8F3DC] border border-[#2D160E] flex items-center justify-center font-black text-sm text-[#2D5A34]">
                2
              </div>
              <h4 className="text-base font-black text-[#2D160E]">Kurasi Humanis Anti-Bullying</h4>
              <p className="text-xs text-[#6B5347] leading-relaxed">
                Setiap pesan diverifikasi oleh tim moderasi HIMASE via Telegram bot tertutup demi mencegah fitnah, SARA, dan pencemaran nama baik.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#2D160E] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#EADCF8] border border-[#2D160E] flex items-center justify-center font-black text-sm text-[#503170]">
                3
              </div>
              <h4 className="text-base font-black text-[#2D160E]">Desain Visual Editorial</h4>
              <p className="text-xs text-[#6B5347] leading-relaxed">
                Pesanmu disulap menjadi kartu Instagram story bernuansa majalah estetik dan kaset retro berkualitas tinggi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. BOTTOM CTA BANNER
      ======================================================== */}
      <section className="text-center pb-6">
        <div className="editorial-card p-8 sm:p-10 bg-[#800020] max-w-2xl mx-auto space-y-4">
          <SparkleCluster size={32} color="#FFFFFF" className="mx-auto" />
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Jangan Biarkan Rasamu Mengendap Sendiri.
          </h2>
          <p className="text-xs sm:text-sm text-white/90 font-semibold max-w-md mx-auto">
            Katakan sekarang lewat Menfess anonim atau sematkan lagu favoritmu lewat Songfess.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onOpenSubmit('menfess')}
              className="btn btn-white text-sm sm:text-base py-3 px-8 shadow-[3px_3px_0_#2D160E]"
            >
              Mulai Tulis Pesan Sekarang
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
