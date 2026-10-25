import React from 'react';
import { 
  Send, 
  Search, 
  Mail, 
  Sparkles,
  ShieldCheck,
  HeartHandshake
} from 'lucide-react';

interface HowItWorksPageProps {
  onNavigateSubmit: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigateSubmit }) => {
  return (
    <div className="editorial-container py-10 md:py-16 space-y-16 md:space-y-24">
      
      {/* Header Banner */}
      <div className="max-w-3xl mx-auto text-center space-y-3">
        <div className="pill-badge pill-maroon text-xs inline-flex items-center gap-1.5">
          <Sparkles size={12} />
          <span>Panduan Pengiriman Publik</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#2D160E] tracking-tight">
          Cara Mengirim{' '}
          <span className="highlight-maroon-box">
            Menfess & Songfess
          </span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-[#6B5347] font-medium leading-relaxed max-w-xl mx-auto">
          Alur mudah dan aman untuk menyampaikan pesan rahasia, apresiasi kampus, hingga lagu favoritmu ke Instagram HIMASE.
        </p>
      </div>

      {/* 4 Simple Public Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* Step 1 */}
        <div className="editorial-card p-6 flex flex-col justify-between bg-white space-y-4">
          <div className="space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#800020] border border-[#2D160E] flex items-center justify-center font-black text-sm text-white shadow-[1.5px_1.5px_0_#2D160E]">
              1
            </div>
            <h3 className="text-lg font-black text-[#2D160E] flex items-center gap-2">
              <Mail size={16} className="text-[#800020]" />
              <span>Pilih Mode Pesan</span>
            </h3>
            <p className="text-xs text-[#6B5347] leading-relaxed">
              Tentukan pilihanmu: <strong>Mode Menfess</strong> untuk pesan teks curhat/apresiasi, atau <strong>Mode Songfess</strong> untuk mendedikasikan lagu spesial beserta potongan lirik favoritmu.
            </p>
          </div>
          <div className="pt-3 border-t border-[#2D160E]/15 text-[11px] font-mono font-bold text-[#800020]">
            Langkah 1 • Formulir
          </div>
        </div>

        {/* Step 2 */}
        <div className="editorial-card p-6 flex flex-col justify-between bg-[#FAF8F5] space-y-4">
          <div className="space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#D8F3DC] border border-[#2D160E] flex items-center justify-center font-black text-sm text-[#2D5A34] shadow-[1.5px_1.5px_0_#2D160E]">
              2
            </div>
            <h3 className="text-lg font-black text-[#2D160E] flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#2D5A34]" />
              <span>Atur Identitasmu</span>
            </h3>
            <p className="text-xs text-[#6B5347] leading-relaxed">
              Tulis target penerima (nama/inisial). Kamu bisa memilih <strong>100% Anonim</strong> tanpa identitas tersimpan, atau memakai nama samaran unik agar si penerima penasaran.
            </p>
          </div>
          <div className="pt-3 border-t border-[#2D160E]/15 text-[11px] font-mono font-bold text-[#2D5A34]">
            Langkah 2 • Privasi Terjamin
          </div>
        </div>

        {/* Step 3 */}
        <div className="editorial-card p-6 flex flex-col justify-between bg-white space-y-4">
          <div className="space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#FEEAA1] border border-[#2D160E] flex items-center justify-center font-black text-sm text-[#664E19] shadow-[1.5px_1.5px_0_#2D160E]">
              3
            </div>
            <h3 className="text-lg font-black text-[#2D160E] flex items-center gap-2">
              <Search size={16} className="text-[#664E19]" />
              <span>Simpan Kode Tiket</span>
            </h3>
            <p className="text-xs text-[#6B5347] leading-relaxed">
              Setelah dikirim, kamu akan langsung memperoleh <strong>Kode Tiket Pelacakan</strong> (contoh: <code>#SF-2026-084</code>). Simpan kode ini untuk memantau status persetujuan pesanmu.
            </p>
          </div>
          <div className="pt-3 border-t border-[#2D160E]/15 text-[11px] font-mono font-bold text-[#664E19]">
            Langkah 3 • Live Tracking
          </div>
        </div>

        {/* Step 4 */}
        <div className="editorial-card p-6 flex flex-col justify-between bg-[#FAF8FC] space-y-4">
          <div className="space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#EADCF8] border border-[#2D160E] flex items-center justify-center font-black text-sm text-[#503170] shadow-[1.5px_1.5px_0_#2D160E]">
              4
            </div>
            <h3 className="text-lg font-black text-[#2D160E] flex items-center gap-2">
              <Sparkles size={16} className="text-[#503170]" />
              <span>Tayang di Instagram</span>
            </h3>
            <p className="text-xs text-[#6B5347] leading-relaxed">
              Pesan yang lolos etika akan didesain menjadi kartu editorial cantik dan diposting ke Instagram Story <strong>@se.cretfess</strong> pada jadwal sesi buka setiap harinya.
            </p>
          </div>
          <div className="pt-3 border-t border-[#2D160E]/15 text-[11px] font-mono font-bold text-[#503170]">
            Langkah 4 • Instagram Story
          </div>
        </div>

      </div>

      {/* Public Tips Section */}
      <div className="editorial-card p-6 sm:p-10 bg-white space-y-6">
        <div className="space-y-2">
          <div className="pill-badge pill-matcha text-xs inline-flex items-center gap-1.5">
            <HeartHandshake size={12} />
            <span>Tips Pengiriman Mahasiswa</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#2D160E]">
            Tips Agar Kirimanmu Cepat Lolos & Berkesan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/20 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#800020] border border-[#2D160E] flex items-center justify-center font-black text-xs text-white">
              1
            </div>
            <h4 className="text-sm font-black text-[#2D160E]">Gunakan Inisial atau Sapaan Santun</h4>
            <p className="text-xs text-[#6B5347] leading-relaxed">
              Sebutkan target penerima dengan nama panggilan atau inisial yang jelas, namun hindari mencantumkan nomor telepon, alamat kost, atau data pribadi yang melanggar privasi.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/20 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#D8F3DC] border border-[#2D160E] flex items-center justify-center font-black text-xs text-[#2D5A34]">
              2
            </div>
            <h4 className="text-sm font-black text-[#2D160E]">Tulis Pesan Bernada Positif</h4>
            <p className="text-xs text-[#6B5347] leading-relaxed">
              Ruang Se.Cretfess dirancang untuk apresiasi, curhat perkuliahan hangat, dan semangat kebersamaan. Kiriman yang memuat kata-kata kasar atau celaan fisik akan otomatis ditolak.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#2D160E]/20 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#EADCF8] border border-[#2D160E] flex items-center justify-center font-black text-xs text-[#503170]">
              3
            </div>
            <h4 className="text-sm font-black text-[#2D160E]">Pilih Lagu yang Sesuai Mood</h4>
            <p className="text-xs text-[#6B5347] leading-relaxed">
              Pada mode Songfess, isi judul lagu dan nama artis dengan tepat. Kamu juga bisa menandai menit favorit serta mengutip lirik lagu yang paling mewakili suasana hatimu.
            </p>
          </div>
        </div>
      </div>

      {/* Lifecycle Status Explainer Table for Public Tracking */}
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <div className="pill-badge pill-white text-xs text-[#2D160E]">
            Panduan Pelacakan
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-[#2D160E]">
            Arti Status di Halaman Cek Status
          </h2>
          <p className="text-xs sm:text-sm text-[#6B5347]">
            Gunakan kode tiketmu di menu Cek Status untuk mengetahui tahapan kirimanmu.
          </p>
        </div>

        <div className="editorial-card overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#FAF8F5] border-b border-[#2D160E] font-black text-[#2D160E]">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Kondisi</th>
                  <th className="py-3 px-4">Penjelasan untuk Kamu</th>
                  <th className="py-3 px-4">Estimasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D160E]/10 font-semibold text-[#2D160E]">
                <tr>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-mono font-bold text-xs">
                      PENDING
                    </span>
                  </td>
                  <td className="py-3 px-4">Menunggu Kurasi</td>
                  <td className="py-3 px-4 text-[#6B5347]">
                    Pesanmu sudah masuk ke sistem dan sedang dalam antrean pemeriksaan oleh pengurus HIMASE.
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">15 - 60 Menit</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-300 font-mono font-bold text-xs">
                      DESIGNED
                    </span>
                  </td>
                  <td className="py-3 px-4">Kartu Disusun</td>
                  <td className="py-3 px-4 text-[#6B5347]">
                    Pesan lolos kurasi! Kartu visual editorial resolusi Instagram Story sedang dibuatkan.
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">1 - 2 Jam</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-300 font-mono font-bold text-xs">
                      READY
                    </span>
                  </td>
                  <td className="py-3 px-4">Siap Tayang</td>
                  <td className="py-3 px-4 text-[#6B5347]">
                    Kartu visual sudah siap dan masuk antrean posting untuk jadwal sesi publikasi terdekat.
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">Sesuai Sesi</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono font-bold text-xs">
                      POSTED
                    </span>
                  </td>
                  <td className="py-3 px-4">Sudah Publikasi</td>
                  <td className="py-3 px-4 text-[#6B5347]">
                    Sudah diunggah ke Instagram Story @se.cretfess! Kamu bisa langsung cek sekarang di Instagram.
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">Selesai</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 font-mono font-bold text-xs">
                      REJECTED
                    </span>
                  </td>
                  <td className="py-3 px-4">Ditolak</td>
                  <td className="py-3 px-4 text-[#6B5347]">
                    Pesan tidak dapat dipublikasikan karena melanggar etika kampus (SARA, privasi, atau kata-kata kasar).
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center pt-4">
        <button
          onClick={onNavigateSubmit}
          className="btn btn-primary btn-capsule text-sm sm:text-base py-3 px-8"
        >
          <Send size={15} />
          <span>Sudah Paham? Mulai Kirim Pesanmu</span>
        </button>
      </div>

    </div>
  );
};
