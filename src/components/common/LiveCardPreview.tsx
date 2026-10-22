import React, { useRef, useState } from 'react';
import { Download, Heart, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { CardTheme, SongData, SubmissionCategory } from '../../types';
import { 
  PencilDoodle, 
  SparkleCluster, 
  TapeStrip 
} from './Doodles';
import { cloudinaryService } from '../../services/cloudinary';

interface LiveCardPreviewProps {
  type: 'menfess' | 'songfess';
  recipient: string;
  senderAlias: string;
  isAnonymous: boolean;
  category: SubmissionCategory;
  message: string;
  theme: CardTheme;
  songData?: SongData;
  trackingCode?: string;
  onThemeChange?: (theme: CardTheme) => void;
  showThemePicker?: boolean;
}

export const LiveCardPreview: React.FC<LiveCardPreviewProps> = ({
  type,
  recipient,
  senderAlias,
  isAnonymous,
  category,
  message,
  theme,
  songData,
  trackingCode = 'SF-PREVIEW',
  onThemeChange,
  showThemePicker = true
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const getThemeStyles = () => {
    switch (theme) {
      case 'matcha':
        return {
          cardBg: '#FAFAF7',
          accentBg: '#D8F3DC',
          accentText: '#2D5A34'
        };
      case 'caramel':
        return {
          cardBg: '#FDFBF7',
          accentBg: '#FEEAA1',
          accentText: '#664E19'
        };
      case 'lavender':
        return {
          cardBg: '#FAF8FC',
          accentBg: '#EADCF8',
          accentText: '#503170'
        };
      case 'pink_cream':
      default:
        return {
          cardBg: '#FFFFFF',
          accentBg: '#FFAEC8',
          accentText: '#2D160E'
        };
    }
  };

  const currentTheme = getThemeStyles();

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      // 1. Snapshot the exact styled DOM node with 3x pixelRatio for ultra-sharp HD
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        quality: 1,
        cacheBust: true,
        imagePlaceholder: 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Ccircle cx="30" cy="30" r="30" fill="%23FFAEC8"/%3E%3C/svg%3E',
        style: {
          transform: 'none'
        }
      });

      const link = document.createElement('a');
      link.download = `secretfess_${trackingCode}_${type}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.warn('DOM snapshot failed, falling back to canvas:', err);
      // Fallback to canvas renderer if needed
      const mockSubmission = {
        id: 'preview',
        trackingCode,
        type,
        recipient: recipient || 'Seseorang',
        senderAlias: senderAlias || 'Anonim',
        isAnonymous,
        category,
        message: message || 'Pesan belum diisi...',
        theme,
        songData,
        status: 'DESIGNED' as const,
        createdAt: new Date().toISOString()
      };

      const dataUrl = await cloudinaryService.exportStoryCanvas(mockSubmission);
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `secretfess_${trackingCode}_${type}.png`;
        link.href = dataUrl;
        link.click();
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Theme Picker Pills */}
      {showThemePicker && onThemeChange && (
        <div className="mb-3 flex items-center gap-1.5 flex-wrap justify-center">
          <span className="text-[11px] font-bold text-[#6B5347] uppercase tracking-wider mr-1">
            Warna:
          </span>
          <button
            type="button"
            onClick={() => onThemeChange('pink_cream')}
            className={`px-2.5 py-0.5 text-xs font-bold rounded-full border border-[#2D160E] transition-all ${
              theme === 'pink_cream' ? 'bg-[#FFAEC8] shadow-[1.5px_1.5px_0_#2D160E]' : 'bg-white opacity-70'
            }`}
          >
            Pink Cream
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('matcha')}
            className={`px-2.5 py-0.5 text-xs font-bold rounded-full border border-[#2D160E] transition-all ${
              theme === 'matcha' ? 'bg-[#D8F3DC] shadow-[1.5px_1.5px_0_#2D160E]' : 'bg-white opacity-70'
            }`}
          >
            Matcha
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('caramel')}
            className={`px-2.5 py-0.5 text-xs font-bold rounded-full border border-[#2D160E] transition-all ${
              theme === 'caramel' ? 'bg-[#FEEAA1] shadow-[1.5px_1.5px_0_#2D160E]' : 'bg-white opacity-70'
            }`}
          >
            Caramel
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('lavender')}
            className={`px-2.5 py-0.5 text-xs font-bold rounded-full border border-[#2D160E] transition-all ${
              theme === 'lavender' ? 'bg-[#EADCF8] shadow-[1.5px_1.5px_0_#2D160E]' : 'bg-white opacity-70'
            }`}
          >
            Lavender
          </button>
        </div>
      )}

      {/* Outer Card Export Canvas: Fully encapsulates the card box, border, shadow, tape, and doodles without clipping */}
      <div 
        ref={cardRef}
        className="p-4 sm:p-5 flex items-center justify-center bg-[#FAF7F2] rounded-3xl"
      >
        <div 
          className={`w-full relative rounded-[22px] border-[2px] border-[#2D160E] p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 ${
            type === 'menfess'
              ? 'w-[320px] sm:w-[340px] aspect-[4/5]'
              : 'w-[300px] sm:w-[320px] aspect-[9/16]'
          }`}
          style={{
            backgroundColor: currentTheme.cardBg,
            boxShadow: '4px 4px 0px #2D160E'
          }}
        >
          {/* Subtle Washi Tape Strip at top */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10 -top-2.5">
            <TapeStrip width={70} height={16} rotate={1} />
          </div>

          {/* Decorative Doodles */}
          <div className="absolute top-3 right-3 pointer-events-none opacity-60">
            <SparkleCluster size={28} color="#2D160E" />
          </div>

          {/* Top Header Section */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider text-[#2D160E] uppercase flex items-center gap-1">
                <span>Se.Cretfess</span>
                <span className="w-1 h-1 rounded-full bg-[#E85B88]"></span>
                <span className="text-[#6B5347]">HIMASE</span>
              </span>

              <span className="text-[10px] font-mono font-bold bg-[#FAF8F5] border border-[#2D160E] px-2 py-0.5 rounded-full shadow-[1px_1px_0_#2D160E]">
                #{trackingCode}
              </span>
            </div>

            {/* Capsule Pill: Recipient */}
            <div className="inline-flex items-center">
              <div 
                className="pill-badge text-xs"
                style={{ backgroundColor: currentTheme.accentBg }}
              >
                <span className="font-medium opacity-80">
                  {type === 'songfess' ? 'Didedikasikan untuk:' : 'Untuk:'}
                </span>
                <span className="font-extrabold truncate max-w-[170px]">
                  {recipient.trim() ? recipient : '@kamu'}
                </span>
              </div>
            </div>
          </div>

          {/* Center Content Section */}
          <div className="my-auto py-2 space-y-3">
            {type === 'menfess' ? (
              <p className="text-sm sm:text-base font-extrabold text-[#2D160E] leading-snug break-words">
                {message.trim() ? (
                  message
                ) : (
                  <span className="text-[#9A8077] italic font-normal text-sm">
                    "Ketik pesan manismu di form... Kartu editorial ini akan otomatis diperbarui secara instan!"
                  </span>
                )}
              </p>
            ) : (
              /* Outer Frame Box that holds the 1:1 music box (shifted up to leave space underneath for manual title) */
              <div className="w-full max-w-[270px] mx-auto min-h-[220px] sm:min-h-[240px] pt-4 sm:pt-5 pb-12 sm:pb-14 px-4 rounded-2xl border-[1.75px] border-[#2D160E] bg-[#FAF8F5] shadow-[2.5px_2.5px_0_#2D160E] flex flex-col items-center justify-start">
                {/* Compact 1:1 Square Box inside (a bit smaller) */}
                <div className="w-[112px] sm:w-[120px] aspect-square rounded-xl border-[1.5px] border-[#2D160E] bg-white p-2 shadow-[1.5px_1.5px_0_#2D160E] flex flex-col items-center justify-center text-center space-y-1 transition-all">
                  <div className="space-y-0.5 px-0.5">
                    <h4 className="text-[10px] font-black text-[#2D160E] leading-tight line-clamp-2">
                      {songData?.title?.trim() ? songData.title : 'Judul Lagu Pilihan'}
                    </h4>
                    <p className="text-[9px] font-bold text-[#6B5347] truncate max-w-[98px]">
                      {songData?.artist?.trim() ? songData.artist : 'Nama Artis / Band'}
                    </p>
                  </div>
                  <div className="pt-0.5">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#2D160E]/20 text-[8.5px] font-mono font-bold text-[#2D160E]">
                      ⏱️ <span className="text-[#E85B88]">{songData?.formattedTimeRange || (songData?.favoriteTimestamp ? songData.favoriteTimestamp : '00:00 - 00:15')}</span>{' '}
                      <span className="text-[#6B5347] font-medium">({songData?.duration ? `${songData.duration}s` : '15s'})</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="pt-2 border-t border-[#2D160E]/15 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#6B5347] uppercase tracking-wider">
                Dari:
              </p>
              <p className="font-hand text-sm sm:text-base font-bold text-[#2D160E]">
                {isAnonymous 
                  ? 'Seseorang yang mengagumi dalam diam' 
                  : (senderAlias.trim() ? senderAlias : 'Anonim')}
              </p>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="flex items-center gap-1 text-[#2D160E]">
                <Heart size={12} className="text-[#E85B88] fill-[#FFAEC8]" />
                <span className="text-[10px] font-bold font-mono">@se.cretfess</span>
              </div>
            </div>
          </div>

          {/* Delicate Pencil in corner */}
          <div className="absolute -bottom-2 -left-2 pointer-events-none opacity-40">
            <PencilDoodle size={28} color="#2D160E" />
          </div>
        </div>
      </div>

      {/* Download Action Button */}
      <div className="mt-3">
        <button
          type="button"
          onClick={handleDownloadCard}
          disabled={isExporting}
          className="btn btn-white btn-sm flex items-center gap-1.5 text-xs font-bold shadow-[2px_2px_0_#2D160E]"
        >
          {isExporting ? (
            <Loader2 size={13} className="animate-spin text-[#E85B88]" />
          ) : (
            <Download size={13} />
          )}
          <span>{isExporting ? 'Menyiapkan Gambar HD...' : 'Download Kartu HD (PNG)'}</span>
        </button>
      </div>
    </div>
  );
};
