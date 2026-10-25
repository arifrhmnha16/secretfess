import React from 'react';
import { Heart, ShieldAlert, HelpCircle } from 'lucide-react';
import { SparkleDoodle, InstagramIcon } from './Doodles';

interface FooterProps {
  setActiveTab: (tab: 'landing' | 'how-it-works' | 'submit' | 'status' | 'admin') => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="mt-24 md:mt-32 border-t-[1.5px] border-[#2D160E] bg-[#FAF8F5]">
      <div className="editorial-container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 pb-10 border-b border-[#2D160E]/15">
          
          {/* Brand & Manifesto */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-[#2D160E]">Se.Cretfess</span>
              <span className="px-2 py-0.5 rounded-full bg-[#800020] border border-[#2D160E] text-[10px] font-black text-white shadow-[1.5px_1.5px_0_#2D160E]">
                HIMASE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#6B5347] max-w-md leading-relaxed font-medium">
              Platform Menfess dan Songfess anonim mahasiswa HIMASE. Ruang aman untuk menyampaikan apresiasi, 
              pesan hangat, curhat perkuliahan, dan melodi yang tak sempat terucap di ruang kelas.
            </p>
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://instagram.com/se.cretfess" 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-white btn-sm flex items-center gap-1.5 text-xs hover:bg-[#800020]/15"
              >
                <InstagramIcon size={13} />
                <span>@se.cretfess</span>
              </a>
            </div>
          </div>

          {/* Quick Nav */}
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-[#2D160E]">
              Eksplorasi
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-sm font-semibold">
              <li>
                <button 
                  onClick={() => { setActiveTab('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-[#6B5347] hover:text-[#2D160E] transition-colors"
                >
                  Beranda Utama
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveTab('how-it-works'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-[#6B5347] hover:text-[#2D160E] transition-colors"
                >
                  Cara Kerja & Panduan
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveTab('submit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-[#6B5347] hover:text-[#2D160E] transition-colors"
                >
                  Kirim Pesan Anonim
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { setActiveTab('status'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-[#6B5347] hover:text-[#2D160E] transition-colors"
                >
                  Lacak Status Tiket
                </button>
              </li>
            </ul>
          </div>

          {/* Safety & Compliance */}
          <div className="space-y-2.5">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-[#2D160E] flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-[#800020]" />
              Komitmen Privasi
            </h4>
            <p className="text-xs text-[#6B5347] leading-relaxed font-medium">
              Data identitas asli tidak pernah disimpan jika kamu memilih opsi <strong>Anonim</strong>. 
              Semua kiriman dimoderasi oleh pengurus demi mencegah doxxing dan cyberbullying.
            </p>
            <div className="p-2.5 bg-[#800020]/15 rounded-xl border border-[#2D160E]/20 text-[11px] font-bold text-[#2D160E] flex items-start gap-1.5">
              <HelpCircle size={14} className="shrink-0 mt-0.5 text-[#2D160E]" />
              <span>Menemukan konten yang merugikanmu? Hubungi DM Instagram @se.cretfess untuk take-down cepat.</span>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-[#6B5347]">
          <div className="flex items-center gap-1.5">
            <span>© 2026 HIMASE • All secret feelings preserved</span>
            <SparkleDoodle size={14} color="#2D160E" />
          </div>

          <div className="flex items-center gap-1.5">
            <span>Dirancang dengan kurasi teliti</span>
            <Heart size={13} className="text-[#800020] fill-[#800020]" />
            <span>untuk mahasiswa</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#9A8077]">
              @se.cretfess • Editorial Edition
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
