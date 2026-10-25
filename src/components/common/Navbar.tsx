import React, { useState } from 'react';
import { Send, BookOpen, Search, Menu, X } from 'lucide-react';
import { SparkleDoodle } from './Doodles';

interface NavbarProps {
  activeTab: 'landing' | 'how-it-works' | 'submit' | 'status' | 'admin';
  setActiveTab: (tab: 'landing' | 'how-it-works' | 'submit' | 'status' | 'admin') => void;
  openSubmitType?: (type: 'menfess' | 'songfess') => void;
  isSongfessOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  openSubmitType,
  isSongfessOpen = true 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: 'landing' | 'how-it-works' | 'submit' | 'status' | 'admin') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 backdrop-blur-sm border-b-[1.5px] border-[#2D160E]">
      <div className="editorial-container flex items-center justify-between h-16 md:h-18">
        
        {/* Brand Logo */}
        <div 
          onClick={() => handleNavClick('landing')}
          className="cursor-pointer flex items-center gap-2 group select-none"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xl md:text-2xl font-black tracking-tight text-[#2D160E]">
              Se<span className="text-[#800020]">.</span>Cretfess
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#800020] border border-[#2D160E] text-[10px] font-black text-white shadow-[1.5px_1.5px_0_#2D160E]">
              HIMASE
            </span>
          </div>
          <SparkleDoodle size={16} color="#800020" className="opacity-90" />
        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => handleNavClick('landing')}
            className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold transition-all ${
              activeTab === 'landing'
                ? 'bg-[#2D160E] text-[#FAF8F5] shadow-[2px_2px_0_#2D160E]'
                : 'text-[#2D160E] hover:bg-[#800020]/15'
            }`}
          >
            Beranda
          </button>

          <button
            onClick={() => handleNavClick('how-it-works')}
            className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'how-it-works'
                ? 'bg-[#2D160E] text-[#FAF8F5] shadow-[2px_2px_0_#2D160E]'
                : 'text-[#2D160E] hover:bg-[#800020]/15'
            }`}
          >
            <BookOpen size={14} />
            Cara Kerja
          </button>

          <button
            onClick={() => handleNavClick('status')}
            className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'status'
                ? 'bg-[#2D160E] text-[#FAF8F5] shadow-[2px_2px_0_#2D160E]'
                : 'text-[#2D160E] hover:bg-[#800020]/15'
            }`}
          >
            <Search size={14} />
            Cek Status
          </button>
        </nav>

        {/* Right CTA / Session indicator */}
        <div className="hidden lg:flex items-center gap-3">
          {isSongfessOpen ? (
            <div className="pill-badge text-[11px] py-1 px-3 !bg-emerald-50 !text-emerald-950 border-emerald-400 shadow-[1.5px_1.5px_0_#2D160E] flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Songfess Dibuka</span>
            </div>
          ) : (
            <div className="pill-badge text-[11px] py-1 px-3 !bg-rose-50 !text-rose-950 border-rose-300 shadow-[1.5px_1.5px_0_#2D160E] flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Songfess Ditutup</span>
            </div>
          )}

          <button
            onClick={() => {
              if (openSubmitType) openSubmitType('menfess');
              handleNavClick('submit');
            }}
            className="btn btn-maroon btn-sm flex items-center gap-1.5"
          >
            <Send size={13} />
            <span>Kirim Pesan</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl border border-[#2D160E] bg-white shadow-[2px_2px_0_#2D160E] text-[#2D160E]"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2D160E] bg-[#FAF8F5] px-4 py-4 space-y-2 shadow-md">
          <div className="pb-2 border-b border-[#2D160E]/10">
            {isSongfessOpen ? (
              <div className="pill-badge text-[11px] py-1 px-3 !bg-emerald-50 !text-emerald-950 border-emerald-400 shadow-[1.5px_1.5px_0_#2D160E] flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Songfess Dibuka</span>
              </div>
            ) : (
              <div className="pill-badge text-[11px] py-1 px-3 !bg-rose-50 !text-rose-950 border-rose-300 shadow-[1.5px_1.5px_0_#2D160E] flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Songfess Ditutup</span>
              </div>
            )}
          </div>

          <button
            onClick={() => handleNavClick('landing')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-sm ${
              activeTab === 'landing' ? 'bg-[#2D160E] text-[#FAF8F5]' : 'text-[#2D160E]'
            }`}
          >
            Beranda
          </button>

          <button
            onClick={() => handleNavClick('how-it-works')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-sm ${
              activeTab === 'how-it-works' ? 'bg-[#2D160E] text-[#FAF8F5]' : 'text-[#2D160E]'
            }`}
          >
            Cara Kerja
          </button>

          <button
            onClick={() => handleNavClick('status')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-sm ${
              activeTab === 'status' ? 'bg-[#2D160E] text-[#FAF8F5]' : 'text-[#2D160E]'
            }`}
          >
            Cek Status Tiket
          </button>

          <div className="pt-2 space-y-2">
            <div className="px-1">
              {isSongfessOpen ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Songfess Dibuka</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Songfess Ditutup</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (openSubmitType) openSubmitType('menfess');
                handleNavClick('submit');
              }}
              className="w-full btn btn-maroon justify-center text-sm py-2.5"
            >
              <Send size={15} />
              <span>Tulis Pesan Sekarang</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
