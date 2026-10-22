# Se.cretfess & Songfess — HIMASE

Platform interaktif pengiriman pesan anonim (**Menfess**) dan kiriman lagu dengan kutipan lirik/pesan (**Songfess**) berbasis web retro-editorial, terintegrasi dengan Firebase Firestore, Cloudinary Image Storage, YouTube Data API, dan Bot Telegram Kontrol Pengurus.

---

## 🌟 Fitur Utama

### 1. Publik (Mahasiswa & Pengunjung)
- **Kirim Menfess**: Formulir pengiriman pesan anonim atau alias dengan pemilihan kategori.
- **Kirim Songfess**: Integrasi pencarian lagu YouTube, pemilihan potongan durasi (15 detik), live audio preview player, dan visual frame Instagram Story.
- **Live Visual Card Preview**: Render kartu editorial real-time yang siap diunduh menjadi gambar berkualitas tinggi (PNG/JPEG) menggunakan `html-to-image`.
- **Cek Status Tiket**: Pelacakan status kiriman secara mandiri menggunakan kode tiket (contoh: `#SF-2026-8691`).
- **Gatekeeping Sesi Songfess**: Validasi kuota dan status buka/tutup sesi otomatis dari database Firestore.

### 2. Panel Moderasi Pengurus (Web Admin)
- Akses via parameter URL terproteksi: `/?admin=himase2026`.
- **Kontrol Sesi & Kuota**: Modal interaktif untuk buka/tutup sesi, atur nomor sesi, batas kuota, dan jam operasional.
- **Workflow Moderasi**: Manajemen status (`PENDING` → `DESIGNED` → `READY` → `POSTED` / `REJECTED`).
- **Live Visual Preview & Download**: Preview langsung desain kartu setiap tiket sebelum dipublikasikan ke Instagram.
- **Export & Filter**: Filter berdasarkan kategori status dan pencarian tiket/nama.

### 3. Kontrol Sesi & Moderasi via Telegram Bot
- **Interactive Inline Buttons**: Pengurus dapat mengontrol sesi dan moderasi langsung dari chat grup Telegram.
- **Panel Kontrol Interaktif (`/panel` atau `/menu`)**:
  - Tombol buka/tutup sesi Songfess dengan sekali tap.
  - Tombol increment nomor sesi (`+1 Sesi`).
  - Tombol refresh statistik & antrean pending.
  - Shortcut atur kuota (30, 50, 100).
- **Notifikasi Kiriman Baru**: Mengirim detail pengirim, penerima, lagu YouTube, dan pesan lengkap disertai tombol moderasi langsung (`Designed`, `Ready`, `Posted`, `Reject`).
- **Command Lengkap**: `/panel`, `/buka`, `/tutup`, `/status`, `/sesi <nomor>`, `/kuota <jumlah>`, `/pending`, `/detail <kode>`, `/ready`, `/design`, `/posted`, `/reject`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Icons & UI**: Lucide React, Canvas Confetti
- **Export Engine**: `html-to-image`
- **Database**: Firebase Firestore
- **Asset Storage**: Cloudinary (Upload Preset)
- **Media API**: YouTube Data API v3, YouTube IFrame Player API
- **Bot Engine**: Node.js (Long Polling via Telegram Bot API)

---

## 📁 Struktur Folder

```
secretfess/
├── public/                 # Static assets & public images
├── scripts/
│   └── telegram-bot.ts     # Standalone Telegram Bot controller
├── src/
│   ├── components/
│   │   ├── common/         # Komponen UI (LiveCardPreview, Navbar, Doodles)
│   │   └── pages/          # Halaman utama (LandingPage, SubmitPage, AdminPage)
│   ├── services/
│   │   ├── cloudinary.ts   # Integrasi upload aset ke Cloudinary
│   │   ├── firebase.ts     # Firestore client & session service
│   │   ├── telegram.ts     # Telegram notification & inline keyboard builder
│   │   └── youtube.ts      # YouTube Data API service
│   ├── types/              # Type definitions TypeScript
│   ├── App.tsx             # Root component & page router
│   ├── index.css           # Styling retro-editorial & Tailwind
│   └── main.tsx            # Entry point React
├── .env.example            # Template environment variables
├── vercel.json             # Konfigurasi routing SPA Vercel
└── package.json
```

---

## 🚀 Panduan Instalasi Lokal

### 1. Clone Repositori
```bash
git clone https://github.com/arifrhmnha16/secretfess.git
cd secretfess
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variable
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi pada file `.env`:
```env
# Firebase Firestore
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=secretfess-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=secretfess-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=secretfess-xxxxx.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxxxxx
VITE_FIREBASE_APP_ID=1:xxxxxxxx:web:xxxxxxxx

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=himasefess_preset

# Telegram Bot
VITE_TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
VITE_TELEGRAM_CHAT_ID=-100xxxxxxxxxx

# YouTube Data API v3
VITE_YOUTUBE_API_KEY=AIzaSy...
```

### 4. Menjalankan Aplikasi Web
```bash
npm run dev
```
Aplikasi akan aktif di `http://localhost:5173`.

### 5. Menjalankan Telegram Bot Controller (Opsional)
Jalankan bot daemon pengurus di terminal terpisah:
```bash
npm run telebot
```

---

## 📦 Build Produksi & Deployment

### Build Lokal
```bash
npm run build
```
Hasil build teroptimasi akan berada di folder `dist/`.

### Deploy ke Vercel
1. Pastikan project terhubung ke Vercel:
   ```bash
   npx vercel
   ```
2. Tambahkan semua Environment Variable di dashboard Vercel (**Project Settings > Environment Variables**):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
   - `VITE_TELEGRAM_BOT_TOKEN`
   - `VITE_TELEGRAM_CHAT_ID`
   - `VITE_YOUTUBE_API_KEY`
3. Deploy ke production:
   ```bash
   npx vercel --prod
   ```

---

## 🔒 Keamanan & Kebijakan Data
- File kredensial (`.env`, service account, secret token) di-exclude secara ketat melalui `.gitignore`.
- Admin panel dilindungi pass-code internal pengurus.
- Kiriman publik difilter melalui proses kurasi sebelum siap tayang ke Instagram.

---

## 📄 Lisensi
Dikelola oleh Tim Himpunan Mahasiswa Sistem Informasi (HIMASE).
