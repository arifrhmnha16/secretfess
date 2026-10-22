import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Send, 
  Music, 
  Mail,
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  BookOpen,
  X,
  Lock,
  Ban,
  ShieldCheck,
  Search,
  Play,
  Pause,
  Sliders,
  RotateCcw,
  Loader2,
  ExternalLink
} from 'lucide-react';
import type { 
  CardTheme, 
  SongData, 
  SubmissionType,
  YouTubeSearchResult
} from '../../types';
import { submissionService, type LiveSessionStatus } from '../../services/firebase';
import { telegramService } from '../../services/telegram';
import { youtubeService } from '../../services/youtube';
import { cloudinaryService } from '../../services/cloudinary';
import { InstagramIcon } from '../common/Doodles';
import { toPng } from 'html-to-image';
import { LiveCardPreview } from '../common/LiveCardPreview';

const YouTubeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface SubmitPageProps {
  initialType?: SubmissionType;
  onNavigateStatus: (code?: string) => void;
  sessionStatus?: LiveSessionStatus | null;
}

const RATE_LIMIT_KEY = 'himasefess_last_submit_time';
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export const SubmitPage: React.FC<SubmitPageProps> = ({ 
  initialType = 'menfess', 
  onNavigateStatus,
  sessionStatus: propSessionStatus
}) => {
  const [submissionType, setSubmissionType] = useState<SubmissionType>(initialType);
  const [recipient, setRecipient] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [senderAlias, setSenderAlias] = useState('');
  const [message, setMessage] = useState('');
  const theme: CardTheme = 'pink_cream';

  // YouTube Songfess States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);

  const [selectedVideo, setSelectedVideo] = useState<YouTubeSearchResult | null>(null);
  const [startTime, setStartTime] = useState<number>(30); // in seconds
  const [duration, setDuration] = useState<10 | 15 | 30>(15); // default 15s
  const [videoMaxDuration, setVideoMaxDuration] = useState<number>(300);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [playbackElapsed, setPlaybackElapsed] = useState<number>(0);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [embedError, setEmbedError] = useState<string | null>(null);

  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);
  const playbackIntervalRef = useRef<any>(null);
  const isTestingSnippetRef = useRef<boolean>(false);

  const [sessionStatus, setSessionStatus] = useState<LiveSessionStatus | null>(null);
  const liveSession = propSessionStatus || sessionStatus;
  const isSongfessOpen = liveSession ? liveSession.isOpen : true;

  // Rules acceptance & modal state
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalData, setSuccessModalData] = useState<{
    code: string;
    telegramDispatched: boolean;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Rate Limiting
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Check rate limit & session status on mount
  useEffect(() => {
    submissionService.getSessionStatus().then(setSessionStatus).catch(() => {});

    const lastSubmit = localStorage.getItem(RATE_LIMIT_KEY);
    if (lastSubmit) {
      const elapsed = Date.now() - Number(lastSubmit);
      if (elapsed < RATE_LIMIT_COOLDOWN_MS) {
        setCooldownRemaining(Math.ceil((RATE_LIMIT_COOLDOWN_MS - elapsed) / 60000));
      }
    }
  }, []);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // When selectedVideo changes, instantiate or destroy YouTube Player safely
  useEffect(() => {
    if (!selectedVideo) {
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
      }
      playerRef.current = null;
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
      }
      return;
    }

    setEmbedError(null);
    setIsPlayingPreview(false);
    setPlaybackElapsed(0);
    setCurrentVideoTime(0);
    isTestingSnippetRef.current = false;

    const setupPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(setupPlayer, 250);
        return;
      }

      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      if (!playerContainerRef.current) return;

      // Provide dynamic placeholder inside ref so React's DOM reconciliation is untouched by YT DOM alterations
      playerContainerRef.current.innerHTML = '<div id="yt-preview-player" class="w-full h-full"></div>';

      try {
        playerRef.current = new window.YT.Player('yt-preview-player', {
          height: '100%',
          width: '100%',
          videoId: selectedVideo.id,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            start: 0
          },
          events: {
            onReady: (e: any) => {
              const dur = e.target.getDuration();
              if (dur && dur > 0) {
                setVideoMaxDuration(Math.floor(dur));
              }
            },
            onStateChange: (e: any) => {
              // Jika user mempause atau video selesai saat mode uji coba snippet aktif
              if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) {
                if (isTestingSnippetRef.current) {
                  stopPlaybackTimer();
                }
              }
            },
            onError: (e: any) => {
              if (e.data === 101 || e.data === 150) {
                setEmbedError('Pemilik video ini menonaktifkan pemutaran embed di situs eksternal. Silakan pilih video atau lagu alternatif lain.');
              } else {
                setEmbedError('Video YouTube tidak dapat diputar. Silakan pilih video alternatif.');
              }
              stopPlaybackTimer();
            }
          }
        });
      } catch (err) {
        console.warn('Failed to initialize YT Player:', err);
      }
    };

    const timer = setTimeout(setupPlayer, 150);

    return () => {
      clearTimeout(timer);
      stopPlaybackTimer();
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
      }
      playerRef.current = null;
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
      }
    };
  }, [selectedVideo]);

  // Pantau detik pemutaran video saat ini agar user tahu menit yang sedang didengar
  useEffect(() => {
    if (!selectedVideo) return;
    const timeTracker = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const t = Math.floor(playerRef.current.getCurrentTime() || 0);
          setCurrentVideoTime(t);
        } catch {}
      }
    }, 350);

    return () => clearInterval(timeTracker);
  }, [selectedVideo]);

  // Timer potongan: HANYA aktif saat tombol 'Uji Dengar Potongan' ditekan
  const startPlaybackTimer = () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
    playbackIntervalRef.current = setInterval(() => {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
      const current = playerRef.current.getCurrentTime();
      const elapsed = Math.max(0, current - startTime);
      setPlaybackElapsed(Math.floor(elapsed));

      // Otomatis stop saat durasi potongan tercapai
      if (current >= startTime + duration || current < startTime - 1) {
        try {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(startTime, true);
        } catch {}
        stopPlaybackTimer();
      }
    }, 200);
  };

  const stopPlaybackTimer = () => {
    isTestingSnippetRef.current = false;
    setIsPlayingPreview(false);
    setPlaybackElapsed(0);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  // Tombol Uji Dengar Potongan: gerak hanya ketika tombol ini diklik
  const handleTogglePreview = () => {
    if (!playerRef.current) return;
    if (isTestingSnippetRef.current || isPlayingPreview) {
      stopPlaybackTimer();
      try {
        playerRef.current.pauseVideo();
        playerRef.current.seekTo(startTime, true);
      } catch {}
    } else {
      isTestingSnippetRef.current = true;
      setIsPlayingPreview(true);
      setPlaybackElapsed(0);
      try {
        playerRef.current.seekTo(startTime, true);
        playerRef.current.playVideo();
      } catch {}
      startPlaybackTimer();
    }
  };

  // Saat menggeser slider: pemain video tetap DIAM (paused), tidak auto-play
  const handleStartTimeChange = (val: number) => {
    stopPlaybackTimer();
    setStartTime(val);
    setPlaybackElapsed(0);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.pauseVideo();
        playerRef.current.seekTo(val, true);
      } catch {}
    }
  };

  // Jadikan posisi pemutar saat ini sebagai titik mulai
  const handleSetCurrentAsStart = () => {
    stopPlaybackTimer();
    const maxStart = Math.max(0, videoMaxDuration - duration);
    const target = Math.min(currentVideoTime, maxStart);
    setStartTime(target);
    setPlaybackElapsed(0);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.pauseVideo();
        playerRef.current.seekTo(target, true);
      } catch {}
    }
  };

  // Ganti durasi potongan (10, 15, 30 detik)
  const handleDurationChange = (d: 10 | 15 | 30) => {
    stopPlaybackTimer();
    setDuration(d);
    if (startTime + d > videoMaxDuration) {
      const newStart = Math.max(0, videoMaxDuration - d);
      setStartTime(newStart);
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(newStart, true);
        } catch {}
      }
    }
    setPlaybackElapsed(0);
  };

  const handleSearchYouTube = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchNotice(null);
    try {
      const res = await youtubeService.searchVideos(searchQuery);
      setSearchResults(res.results);
      setHasSearched(true);
      if (res.error) {
        setSearchNotice(res.error);
      }
    } catch {
      setSearchNotice('Gagal melakukan pencarian YouTube.');
    } finally {
      setIsSearching(false);
    }
  };

  const validate = (): string | null => {
    if (!rulesAccepted) {
      return 'Kamu wajib membaca dan menyetujui peraturan HIMASEFESS terlebih dahulu.';
    }
    if (!recipient.trim()) {
      return 'Harap isi nama atau inisial penerima (Untuk Siapa).';
    }
    if (!isAnonymous && !senderAlias.trim()) {
      return 'Jika tidak anonim, harap isi nama samaran atau alias pengirim.';
    }
    if (submissionType === 'menfess') {
      if (!message.trim() || message.trim().length < 5) {
        return 'Pesan terlalu pendek. Tulis minimal 5 karakter.';
      }
      if (message.length > 500) {
        return 'Pesan melebihi batas 500 karakter.';
      }
    }
    if (submissionType === 'songfess') {
      if (!isSongfessOpen) {
        return 'Sesi Songfess sedang ditutup oleh pengurus HIMASE. Silakan pantau Instagram @se.cretfess untuk jadwal pembukaan sesi.';
      }
      if (!selectedVideo) {
        return 'Untuk Songfess, silakan cari dan pilih lagu dari YouTube terlebih dahulu.';
      }
      if (embedError) {
        return 'Video yang dipilih dibatasi oleh pemiliknya (disallow embed). Silakan pilih video atau lagu alternatif lain.';
      }
    }
    return null;
  };

  const handleCloseSuccessModal = () => {
    setSuccessModalData(null);
    setMessage('');
    setSelectedVideo(null);
    setSearchResults([]);
    setSearchQuery('');
    setRecipient('');
    setSenderAlias('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const error = validate();
    if (error) {
      setErrorMessage(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const trackingCode = submissionService.generateTrackingCode();
      
      const songData: SongData | undefined = submissionType === 'songfess' && selectedVideo ? {
        title: selectedVideo.title,
        artist: selectedVideo.channelTitle,
        youtubeVideoId: selectedVideo.id,
        youtubeUrl: `https://www.youtube.com/watch?v=${selectedVideo.id}`,
        thumbnailUrl: selectedVideo.thumbnailUrl,
        startTime,
        endTime: startTime + duration,
        duration,
        formattedTimeRange: `${youtubeService.formatSecondsToTime(startTime)} – ${youtubeService.formatSecondsToTime(startTime + duration)}`
      } : undefined;

      const finalMessage = submissionType === 'songfess' && selectedVideo
        ? `Mempersembahkan lagu "${selectedVideo.title}" (${selectedVideo.channelTitle}) [${youtubeService.formatSecondsToTime(startTime)} - ${youtubeService.formatSecondsToTime(startTime + duration)}]`
        : message.trim();

      // Auto-render HD Story Card directly from LiveCardPreview component
      let cardImageUrl: string | undefined = undefined;
      try {
        let canvasDataUrl: string | null = null;
        const targetElement = (exportCardRef.current?.querySelector('.rounded-3xl') || exportCardRef.current?.firstElementChild || exportCardRef.current) as HTMLElement | null;

        if (targetElement) {
          try {
            canvasDataUrl = await toPng(targetElement, {
              pixelRatio: 3,
              quality: 1,
              cacheBust: true,
              style: {
                transform: 'none'
              }
            });
          } catch (e) {
            console.warn('toPng DOM capture warning:', e);
          }
        }

        // Fallback to canvas renderer if DOM snapshot wasn't available
        if (!canvasDataUrl) {
          canvasDataUrl = await cloudinaryService.exportStoryCanvas({
            id: 'temp',
            trackingCode,
            type: submissionType,
            recipient: recipient.trim(),
            senderAlias: isAnonymous ? 'Anonim' : senderAlias.trim(),
            isAnonymous,
            category: 'general',
            message: finalMessage,
            theme,
            songData,
            status: 'PENDING',
            createdAt: new Date().toISOString()
          });
        }

        if (canvasDataUrl) {
          const uploadedUrl = await cloudinaryService.uploadCardImage(canvasDataUrl, trackingCode);
          if (uploadedUrl) {
            cardImageUrl = uploadedUrl;
          }
        }
      } catch (renderErr) {
        console.warn('Auto-render to Cloudinary failed:', renderErr);
      }

      const created = await submissionService.createSubmission({
        trackingCode,
        type: submissionType,
        recipient: recipient.trim(),
        senderAlias: isAnonymous ? 'Anonim' : senderAlias.trim(),
        isAnonymous,
        category: 'general',
        message: finalMessage,
        theme,
        songData,
        cardImageUrl
      });

      let telegramDispatched = false;
      try {
        const telegramResult = await telegramService.notifyTelegramGroup(created);
        telegramDispatched = Boolean(telegramResult?.success);
      } catch (err) {
        console.warn('Telegram notification failed:', err);
      }

      localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
      setCooldownRemaining(10);

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {
        // Confetti optional
      }

      setSuccessModalData({
        code: trackingCode,
        telegramDispatched
      });
    } catch (err) {
      console.error('Submission failed:', err);
      setErrorMessage('Terjadi kendala saat mengirim pesan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (successModalData?.code) {
      navigator.clipboard.writeText(successModalData.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="editorial-container py-10 md:py-16">
      
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="pill-badge pill-pink text-xs">
            Formulir Pengiriman
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#2D160E] tracking-tight">
            Ungkapkan{' '}
            <span className="highlight-pink-box">
              Perasaanmu
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6B5347] font-medium leading-relaxed">
            Pesanmu akan dikurasi oleh tim pengurus HIMASE melalui bot Telegram sebelum diposting ke Instagram.
          </p>

          {/* Type Selector (Menfess vs Songfess) */}
          <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSubmissionType('menfess')}
              className={`btn btn-capsule text-xs sm:text-sm py-2 px-5 transition-all flex items-center gap-2 ${
                submissionType === 'menfess'
                  ? 'btn-primary'
                  : 'btn-white'
              }`}
            >
              <Mail size={14} />
              <span>Menfess Anonim</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                24 Jam
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubmissionType('songfess')}
              className={`btn btn-capsule text-xs sm:text-sm py-2 px-5 transition-all flex items-center gap-2 ${
                submissionType === 'songfess'
                  ? 'btn-pink'
                  : 'btn-white'
              }`}
            >
              <Music size={14} />
              <span>Songfess (Lagu)</span>
              {isSongfessOpen ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Buka
                </span>
              ) : (
                <span className="text-[10px] bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full font-bold">
                  Tutup
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Live Session Quota Status Pill */}
        {liveSession && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-[#2D160E] shadow-[2.5px_2.5px_0_#2D160E] text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSongfessOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-black text-[#2D160E]">
                {isSongfessOpen ? 'Sesi Songfess Dibuka' : 'Sesi Songfess Ditutup'}
              </span>
              <span className="text-[#6B5347] font-semibold">({liveSession.operatingHours})</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-[#6B5347]">
                Tersisa {liveSession.quotaRemaining} slot
              </span>
              <span className="font-mono font-bold bg-[#FAF8F5] border border-[#2D160E] px-2 py-0.5 rounded-md text-[#2D160E]">
                Kuota: {liveSession.quotaUsed} / {liveSession.quotaTotal}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================
            RULES DISCLAIMER & MANDATORY ACCEPTANCE BOX (Above Form)
        ======================================================== */}
        <div className="editorial-card p-5 bg-[#FAF8F5] border border-[#2D160E] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-[#E85B88] shrink-0" />
              <h3 className="text-sm font-black text-[#2D160E]">
                Wajib Baca Peraturan Komunitas
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="btn btn-white btn-sm flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold"
            >
              <BookOpen size={13} />
              <span>Buka Ketentuan & Rules</span>
            </button>
          </div>

          <p className="text-xs text-[#6B5347] leading-relaxed font-medium">
            Untuk menjaga kenyamanan bersama, dilarang keras mengirimkan ujaran kebencian, SARA, bullying, 
            dan penyebaran data pribadi (doxxing). Kiriman yang melanggar akan langsung ditolak pengurus.
          </p>

          {/* Mandatory Checkbox */}
          <div className="pt-2 border-t border-[#2D160E]/15">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[#E85B88] rounded cursor-pointer shrink-0"
              />
              <span className="text-xs font-bold text-[#2D160E] leading-normal">
                Saya telah membaca, memahami, dan berjanji mematuhi seluruh peraturan HIMASEFESS.
                {!rulesAccepted && <span className="text-[#E85B88] ml-1">(Wajib dicentang)</span>}
              </span>
            </label>
          </div>
        </div>

        {/* Rate Limiting Notice */}
        {cooldownRemaining > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-900 font-semibold">
            <Clock size={16} className="shrink-0 text-amber-700 mt-0.5" />
            <div>
              <p className="font-bold">Mode Rate Limiting Aktif (1 kiriman per 10 menit)</p>
              <p>Tersisa ~{cooldownRemaining} menit lagi. (Dalam mode dev, kamu tetap dapat menguji kirim).</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-center gap-2 text-xs text-rose-800 font-bold">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================
            MAIN SUBMISSION FORM (Clean & Focused, No Live Preview)
        ======================================================== */}
        <div className="editorial-card p-6 sm:p-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Target Recipient */}
            <div>
              <label className="input-label flex items-center justify-between">
                <span>Untuk Siapa? (Target) <span className="text-[#E85B88]">*</span></span>
                <span className="text-[11px] font-normal text-[#6B5347]">Contoh: @clarissa atau Kak Lab SE</span>
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Tulis nama, inisial, atau akun target..."
                className="editorial-input"
                maxLength={60}
                required
              />
            </div>

            {/* Sender Identity */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#2D160E] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 accent-[#E85B88] rounded cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-bold text-[#2D160E]">
                  Kirim secara 100% Anonim
                </span>
                <span className="pill-badge pill-white text-[10px] py-0.5 px-2">
                  Identitas Rahasia
                </span>
              </label>

              {!isAnonymous && (
                <div className="pt-1.5">
                  <label className="input-label text-xs">
                    Nama Samaran / Alias Pengirim <span className="text-[#E85B88]">*</span>
                  </label>
                  <input
                    type="text"
                    value={senderAlias}
                    onChange={(e) => setSenderAlias(e.target.value)}
                    placeholder="Contoh: Teman Sebangkumu, Secret Admirer..."
                    className="editorial-input text-xs sm:text-sm"
                    maxLength={50}
                  />
                </div>
              )}
            </div>

            {/* Songfess Dedicated YouTube Search & Trim Section */}
            {submissionType === 'songfess' && (
              !isSongfessOpen ? (
                /* Closed Notification Card */
                <div className="p-6 rounded-2xl bg-rose-50/80 border-2 border-rose-300 shadow-[3px_3px_0_#2D160E] space-y-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-600 shadow-[2px_2px_0_#2D160E]">
                    <Music size={26} />
                  </div>

                  <div className="space-y-1.5">
                    <span className="pill-badge text-[10px] bg-rose-200 text-rose-900 border-rose-300 font-bold">
                      Sesi Ditutup Sementara
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-[#2D160E]">
                      Sesi Songfess Sedang Ditutup
                    </h3>
                    <p className="text-xs sm:text-sm text-[#6B5347] max-w-md mx-auto leading-relaxed font-medium">
                      Saat ini pengurus HIMASE sedang menutup sesi Songfess. Pantau terus Instagram <strong>@se.cretfess</strong> untuk mengetahui kapan sesi Songfess dibuka kembali!
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                    <a
                      href="https://www.instagram.com/se.cretfess/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-pink text-xs font-bold py-2.5 px-4 flex items-center justify-center gap-1.5 shadow-[2px_2px_0_#2D160E]"
                    >
                      <InstagramIcon size={14} />
                      <span>Pantau Instagram @se.cretfess</span>
                      <ExternalLink size={12} />
                    </a>

                    <button
                      type="button"
                      onClick={() => setSubmissionType('menfess')}
                      className="btn btn-white text-xs font-bold py-2.5 px-4 flex items-center justify-center gap-1.5 shadow-[2px_2px_0_#2D160E]"
                    >
                      <Mail size={14} />
                      <span>Kirim Menfess Saja (Buka 24 Jam)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8FC] border border-[#2D160E] shadow-[2.5px_2.5px_0_#2D160E] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="pill-badge pill-lavender text-xs">
                        <YouTubeIcon size={14} className="text-red-600" />
                        Pencarian Lagu YouTube
                      </span>
                    </div>
                  {selectedVideo && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVideo(null);
                        setEmbedError(null);
                        setIsPlayingPreview(false);
                      }}
                      className="text-[11px] font-bold text-[#E85B88] hover:underline flex items-center gap-1"
                    >
                      <RotateCcw size={11} />
                      <span>Ganti Lagu</span>
                    </button>
                  )}
                </div>

                {/* 1. YouTube Search Bar (Visible if no video selected) */}
                {!selectedVideo ? (
                  <div className="space-y-3">
                    <label className="input-label text-xs">
                      Cari Judul Lagu atau Musisi di YouTube <span className="text-[#E85B88]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchYouTube();
                            }
                          }}
                          placeholder="Ketik judul lagu / penyanyi (contoh: Bernadya, Juicy Luicy)..."
                          className="editorial-input text-xs sm:text-sm pl-9"
                        />
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8077]" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSearchYouTube()}
                        disabled={isSearching || !searchQuery.trim()}
                        className="btn btn-primary text-xs font-bold px-4 shrink-0 flex items-center gap-1.5"
                      >
                        {isSearching ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Search size={13} />
                        )}
                        <span>Cari</span>
                      </button>
                    </div>

                    {/* Notice / Alert if fallback or development */}
                    {searchNotice && (
                      <p className="text-[11px] text-[#6B5347] font-semibold bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                        {searchNotice}
                      </p>
                    )}

                    {/* Empty Search Result State */}
                    {hasSearched && !isSearching && searchResults.length === 0 && !searchNotice && (
                      <p className="text-xs text-[#6B5347] font-semibold bg-[#FAF8F5] p-3 rounded-xl border border-[#2D160E] text-center">
                        Tidak ditemukan video untuk kata kunci "{searchQuery}". Silakan coba kata kunci lain.
                      </p>
                    )}

                    {/* Results Grid / List */}
                    {searchResults.length > 0 && (
                      <div className="space-y-2 pt-1 max-h-72 overflow-y-auto pr-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B5347]">
                          Pilih Salah Satu Lagu:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {searchResults.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedVideo(item);
                                setStartTime(30);
                                setDuration(15);
                              }}
                              className="p-2.5 rounded-xl border border-[#2D160E] bg-white hover:bg-[#FFAEC8]/15 cursor-pointer transition-all flex items-start gap-2.5 group shadow-[1.5px_1.5px_0_#2D160E]"
                            >
                              <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                className="w-16 h-12 rounded-lg object-cover border border-[#2D160E] shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-black text-[#2D160E] line-clamp-1 group-hover:text-[#E85B88]">
                                  {item.title}
                                </h5>
                                <p className="text-[11px] font-semibold text-[#6B5347] truncate">
                                  {item.channelTitle}
                                </p>
                                <span className="inline-block mt-1 text-[10px] font-bold text-[#E85B88]">
                                  Pilih Lagu Ini &rarr;
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 2. Selected Video, IFrame Player & Snippet Trimmer */
                  <div className="space-y-4">
                    {/* Selected Song Badge */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#2D160E] shadow-[2px_2px_0_#2D160E]">
                      <img
                        src={selectedVideo.thumbnailUrl}
                        alt=""
                        className="w-14 h-11 rounded-lg object-cover border border-[#2D160E] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#E85B88] flex items-center gap-1">
                          <YouTubeIcon size={11} className="text-red-600" />
                          Lagu Terpilih
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-[#2D160E] truncate">
                          {selectedVideo.title}
                        </h4>
                        <p className="text-[11px] font-bold text-[#6B5347] truncate">
                          {selectedVideo.channelTitle}
                        </p>
                      </div>
                    </div>

                    {/* YouTube IFrame Player Container */}
                    <div className="space-y-2">
                      <div className="rounded-xl overflow-hidden border border-[#2D160E] bg-black shadow-[2px_2px_0_#2D160E] relative aspect-video max-h-52">
                        <div ref={playerContainerRef} className="w-full h-full"></div>
                      </div>

                      {/* Embed Error Banner */}
                      {embedError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-start gap-2">
                          <ShieldAlert size={16} className="text-rose-700 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Pemutaran Embed Dibatasi</p>
                            <p>{embedError}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVideo(null);
                                setEmbedError(null);
                              }}
                              className="mt-1 text-xs font-bold underline text-rose-800"
                            >
                              Klik di sini untuk mencari video lain
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Live Playback Indicator & Fast Bookmark Button */}
                      {!embedError && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-[#2D160E] shadow-[1.5px_1.5px_0_#2D160E] text-xs">
                          <div className="flex items-center gap-2 text-[#6B5347]">
                            <Clock size={15} className="text-[#E85B88] shrink-0" />
                            <span className="font-medium">Posisi Putar Video:</span>
                            <span className="font-mono font-bold text-[#2D160E] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#2D160E]/20">
                              {youtubeService.formatSecondsToTime(currentVideoTime)}
                            </span>
                            <span className="text-[10px] text-[#9A8077] hidden md:inline">
                              (Cari detik favoritmu di pemutar)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleSetCurrentAsStart}
                            className="btn btn-sm btn-white text-[11px] font-bold text-[#2D160E] hover:text-[#E85B88] border border-[#2D160E] py-1 px-3 shadow-[1px_1px_0_#2D160E] flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto"
                            title="Jadikan posisi detik pemutar saat ini sebagai titik mulai"
                          >
                            <span>Gunakan Menit Ini ({youtubeService.formatSecondsToTime(currentVideoTime)}) Sebagai Titik Mulai &darr;</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Snippet Trim Slider & Controls */}
                    <div className="p-4 rounded-xl bg-white border border-[#2D160E] shadow-[2px_2px_0_#2D160E] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#2D160E]">
                          <Sliders size={13} className="text-[#E85B88]" />
                          <span>Pilih Potongan Musik (Snippet Trim)</span>
                        </div>

                        {/* Duration Selector: 10s, 15s (default), 30s */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-[#6B5347] mr-1">Durasi:</span>
                          {([10, 15, 30] as const).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleDurationChange(d)}
                              className={`px-2.5 py-0.5 text-xs font-bold rounded-full border border-[#2D160E] transition-all ${
                                duration === d
                                  ? 'bg-[#FFAEC8] shadow-[1.5px_1.5px_0_#2D160E] text-[#2D160E]'
                                  : 'bg-[#FAF8F5] text-[#6B5347] hover:bg-white'
                              }`}
                            >
                              {d} Detik {d === 15 && '(Default)'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Start Timestamp Slider */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs font-mono font-bold text-[#2D160E]">
                          <span>Mulai: <span className="text-[#E85B88]">{youtubeService.formatSecondsToTime(startTime)}</span></span>
                          <span>Selesai: <span className="text-[#E85B88]">{youtubeService.formatSecondsToTime(startTime + duration)}</span></span>
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={Math.max(10, videoMaxDuration - duration)}
                          step={1}
                          value={startTime}
                          onChange={(e) => handleStartTimeChange(Number(e.target.value))}
                          className="w-full accent-[#E85B88] cursor-pointer"
                        />

                        <div className="flex items-center justify-between text-[10px] font-semibold text-[#9A8077]">
                          <span>00:00</span>
                          <span>Geser untuk atur titik mulai (Video tetap diam saat digeser)</span>
                          <span>{youtubeService.formatSecondsToTime(videoMaxDuration)}</span>
                        </div>
                      </div>

                      {/* Interactive Snippet Playback Button with auto-stop */}
                      <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#2D160E]/10">
                        <button
                          type="button"
                          onClick={handleTogglePreview}
                          className={`btn btn-sm flex items-center gap-1.5 text-xs font-bold py-2 px-4 shadow-[1.5px_1.5px_0_#2D160E] ${
                            isPlayingPreview ? 'bg-amber-100 text-amber-900 border-amber-400' : 'btn-pink'
                          }`}
                        >
                          {isPlayingPreview ? (
                            <>
                              <Pause size={13} />
                              <span>Berhenti ({playbackElapsed}/{duration}s)</span>
                            </>
                          ) : (
                            <>
                              <Play size={13} />
                              <span>Uji Dengar Potongan ({duration}s)</span>
                            </>
                          )}
                        </button>

                        <span className="text-[11px] font-semibold text-[#6B5347]">
                          Otomatis berhenti setelah {duration} detik.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Message Textarea (Hanya untuk Menfess) */}
          {submissionType === 'menfess' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="input-label mb-0">
                  Isi Pesan <span className="text-[#E85B88]">*</span>
                </label>
                <span className={`text-[11px] font-mono font-bold ${
                  message.length > 450 ? 'text-[#E85B88]' : 'text-[#6B5347]'
                }`}>
                  {message.length} / 500
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan isi hatimu dengan sopan dan penuh kehangatan..."
                className="editorial-textarea"
                maxLength={500}
                required
              />
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting || !rulesAccepted || (submissionType === 'songfess' && !isSongfessOpen)}
              className={`w-full btn text-sm sm:text-base py-3 flex items-center justify-center gap-2 transition-all ${
                rulesAccepted && (submissionType !== 'songfess' || isSongfessOpen)
                  ? 'btn-primary'
                  : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <span>Mengirim ke antrean kurasi...</span>
              ) : (submissionType === 'songfess' && !isSongfessOpen) ? (
                <span>Sesi Songfess Sedang Ditutup (Pantau IG @se.cretfess)</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>Kirim ke Pengurus HIMASE</span>
                </>
              )}
            </button>

            {!rulesAccepted && (
              <p className="text-[11px] text-[#E85B88] font-bold text-center mt-2">
                * Centang kotak persetujuan rules di atas untuk mengaktifkan tombol kirim.
              </p>
            )}

            {rulesAccepted && submissionType === 'songfess' && !isSongfessOpen && (
              <p className="text-[11px] text-rose-600 font-bold text-center mt-2">
                * Sesi Songfess sedang ditutup oleh pengurus. Silakan pilih tab Menfess (Buka 24 Jam) atau pantau Instagram @se.cretfess.
              </p>
            )}
          </div>

          </form>
        </div>

      </div>

      {/* ========================================================
          RULES MODAL POPUP
      ======================================================== */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="editorial-card p-6 sm:p-8 bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-[6px_6px_0_#2D160E] relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#2D160E]/15">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#E85B88]" />
                <h3 className="text-base sm:text-lg font-black text-[#2D160E]">
                  Ketentuan & Peraturan HIMASEFESS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="p-1 rounded-lg border border-[#2D160E] bg-[#FAF8F5] text-[#2D160E] hover:bg-[#FFAEC8] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#2D160E]">
              
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                <p className="font-black text-rose-800 flex items-center gap-1.5">
                  <Ban size={14} />
                  1. Larangan SARA & Ujaran Kebencian
                </p>
                <p className="text-[#6B5347] leading-relaxed">
                  Dilarang mendiskriminasi suku, agama, ras, dan antargolongan, maupun melontarkan penghinaan kebencian.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                <p className="font-black text-amber-800 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  2. Anti-Bullying & Body Shaming
                </p>
                <p className="text-[#6B5347] leading-relaxed">
                  Dilarang mencela fisik, menyebarkan rumor jahat tanpa bukti, atau memojokkan rekan kampus.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 space-y-1">
                <p className="font-black text-purple-800 flex items-center gap-1.5">
                  <Lock size={14} />
                  3. Perlindungan Privasi & Anti-Doxxing
                </p>
                <p className="text-[#6B5347] leading-relaxed">
                  Dilarang membagikan no. telepon/WhatsApp, alamat rumah/kost, plat nomor kendaraan, atau data privat.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                <p className="font-black text-emerald-800 flex items-center gap-1.5">
                  <Clock size={14} />
                  4. Rate Limiting (Anti-Spam)
                </p>
                <p className="text-[#6B5347] leading-relaxed">
                  Dibatasi 1 kiriman setiap 10 menit per perangkat demi membagi kuota secara adil.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-pink-50 border border-pink-200 space-y-1">
                <p className="font-black text-[#E85B88] flex items-center gap-1.5">
                  <Music size={14} />
                  5. Ketentuan Songfess
                </p>
                <p className="text-[#6B5347] leading-relaxed">
                  Gunakan judul lagu dan artis yang jelas. Lirik tidak boleh bermuatan pornografi atau kekerasan eksplisit.
                </p>
              </div>

            </div>

            <div className="pt-3 border-t border-[#2D160E]/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRulesAccepted(true);
                  setShowRulesModal(false);
                }}
                className="btn btn-primary text-xs py-2 px-5"
              >
                Saya Paham & Setuju
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          SUCCESS MODAL WITH TRACKING CODE
      ======================================================== */}
      {successModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="editorial-card p-6 sm:p-8 bg-white max-w-md w-full space-y-4 shadow-[6px_6px_0_#2D160E] relative">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#FFAEC8] border border-[#2D160E] flex items-center justify-center mx-auto text-[#2D160E] shadow-[2px_2px_0_#2D160E]">
                <CheckCircle size={26} />
              </div>

              <h3 className="text-xl font-black text-[#2D160E]">
                Pesan Berhasil Terkirim!
              </h3>
              <p className="text-xs text-[#6B5347] leading-relaxed">
                Pesanmu sudah masuk ke database Firestore dan notifikasi telah dikirimkan ke grup kurasi pengurus HIMASE.
              </p>
            </div>

            {/* Tracking Code Box */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#2D160E] space-y-1.5 text-center">
              <p className="text-[11px] font-bold text-[#6B5347] uppercase tracking-wider">
                Kode Tiket Pelacakanmu:
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-black font-mono text-[#2D160E] tracking-wider">
                  #{successModalData.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg bg-white border border-[#2D160E] text-[#2D160E] hover:bg-[#FFAEC8] transition-colors"
                  title="Salin Kode"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-[#6B5347]">
                Simpan kode ini untuk melacak status persetujuan atau publikasi pesanmu.
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const code = successModalData.code;
                  handleCloseSuccessModal();
                  onNavigateStatus(code);
                }}
                className="w-full btn btn-primary text-xs sm:text-sm py-2.5 flex items-center justify-center gap-1.5"
              >
                <span>Lacak Status Tiket Sekarang</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={handleCloseSuccessModal}
                className="w-full btn btn-white text-xs py-2"
              >
                Tutup & Tulis Pesan Lain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offscreen LiveCardPreview for pixel-perfect identical export with Admin Panel */}
      <div 
        aria-hidden="true" 
        style={{ 
          position: 'fixed', 
          left: -99999, 
          top: 0, 
          width: 360, 
          pointerEvents: 'none', 
          opacity: 0,
          zIndex: -1 
        }}
      >
        <div ref={exportCardRef}>
          <LiveCardPreview
            type={submissionType}
            recipient={recipient.trim()}
            senderAlias={senderAlias.trim()}
            isAnonymous={isAnonymous}
            category="general"
            message={submissionType === 'songfess' && selectedVideo
              ? `Mempersembahkan lagu "${selectedVideo.title}" (${selectedVideo.channelTitle}) [${youtubeService.formatSecondsToTime(startTime)} - ${youtubeService.formatSecondsToTime(startTime + duration)}]`
              : message.trim()}
            theme={theme}
            songData={submissionType === 'songfess' && selectedVideo ? {
              title: selectedVideo.title,
              artist: selectedVideo.channelTitle,
              youtubeUrl: `https://www.youtube.com/watch?v=${selectedVideo.id}`,
              thumbnailUrl: selectedVideo.thumbnailUrl,
              startTime,
              endTime: startTime + duration,
              duration,
              formattedTimeRange: `${youtubeService.formatSecondsToTime(startTime)} – ${youtubeService.formatSecondsToTime(startTime + duration)}`
            } : undefined}
            trackingCode="SF-CARD"
            showThemePicker={false}
          />
        </div>
      </div>

    </div>
  );
};
