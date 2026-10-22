/**
 * TELEGRAM BOT CONTROLLER - HIMASEFESS / SECRETFESS
 * 
 * Bot controller untuk pengurus HIMASE agar bisa:
 * 1. Buka / Tutup Sesi Songfess langsung dari chat Telegram
 * 2. Atur nomor sesi & kuota pengiriman via tombol atau command
 * 3. Pantau status sesi & antrean kiriman (pending, designed, ready, posted)
 * 4. Moderasi kiriman langsung via inline keyboard button di notifikasi
 * 
 * Jalankan bot:
 * npm run telebot
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// 1. Load Configurations from process.env
const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
const ALLOWED_CHAT_IDS = (process.env.VITE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

if (!BOT_TOKEN || BOT_TOKEN.includes('your_')) {
  console.error('\n❌ [ERROR] VITE_TELEGRAM_BOT_TOKEN belum diisi di file .env!');
  console.error('Silakan isi token dari @BotFather di file .env terlebih dahulu.\n');
  process.exit(1);
}

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Types
interface SessionConfig {
  isOpen: boolean;
  sessionNumber: number;
  quotaTotal: number;
  operatingHours: string;
  title?: string;
  announcement?: string;
}

interface SubmissionItem {
  id: string;
  type: 'menfess' | 'songfess';
  recipient: string;
  senderAlias: string;
  isAnonymous: boolean;
  category: string;
  message: string;
  trackingCode: string;
  status: 'PENDING' | 'DESIGNED' | 'READY' | 'POSTED' | 'REJECTED';
  statusNote?: string;
  createdAt: string;
  songData?: {
    title: string;
    artist: string;
    youtubeUrl?: string;
    formattedTimeRange?: string;
  };
}

// Security Check
function isAuthorized(chatId: string | number, userId?: string | number): boolean {
  if (ALLOWED_CHAT_IDS.length === 0) return true;
  const strChatId = String(chatId);
  const strUserId = userId ? String(userId) : '';
  return ALLOWED_CHAT_IDS.includes(strChatId) || (strUserId ? ALLOWED_CHAT_IDS.includes(strUserId) : false);
}

// Telegram Helper Methods
async function callTelegram(method: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`${TELEGRAM_API_URL}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error(`[Telegram API Error: ${method}]`, err);
    return null;
  }
}

async function sendMessage(chatId: number | string, text: string, replyMarkup?: unknown) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function editMessageText(chatId: number | string, messageId: number, text: string, replyMarkup?: unknown) {
  return callTelegram('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert: boolean = false) {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text || '',
    show_alert: showAlert
  });
}

// Firestore Helper Methods
async function getSessionData(): Promise<SessionConfig> {
  const sessionRef = doc(db, 'config', 'session');
  const snap = await getDoc(sessionRef);
  if (snap.exists()) {
    const data = snap.data();
    return {
      isOpen: data.isOpen ?? true,
      sessionNumber: data.sessionNumber === 12 ? 1 : (data.sessionNumber || 1),
      quotaTotal: data.quotaTotal || 50,
      operatingHours: data.operatingHours || '18:00 – 23:00 WIB',
      title: data.title,
      announcement: data.announcement
    };
  }
  return {
    isOpen: true,
    sessionNumber: 1,
    quotaTotal: 50,
    operatingHours: '18:00 – 23:00 WIB'
  };
}

async function updateSessionData(data: Partial<SessionConfig>): Promise<void> {
  const sessionRef = doc(db, 'config', 'session');
  await setDoc(sessionRef, data, { merge: true });
}

async function getStats() {
  const session = await getSessionData();
  const subsSnap = await getDocs(collection(db, 'submissions'));
  
  let total = 0;
  let pending = 0;
  let designed = 0;
  let ready = 0;
  let posted = 0;
  let rejected = 0;

  subsSnap.forEach((docSnap) => {
    total++;
    const st = docSnap.data().status;
    if (st === 'PENDING') pending++;
    else if (st === 'DESIGNED') designed++;
    else if (st === 'READY') ready++;
    else if (st === 'POSTED') posted++;
    else if (st === 'REJECTED') rejected++;
  });

  return {
    session,
    total,
    pending,
    designed,
    ready,
    posted,
    rejected
  };
}

async function findSubmissionByCode(code: string): Promise<SubmissionItem | null> {
  const clean = code.trim().toUpperCase().replace(/^#/, '');
  const q = query(collection(db, 'submissions'), where('trackingCode', '==', clean), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { ...(d.data() as SubmissionItem), id: d.id };
  }
  return null;
}

// UI Formatters for Telegram
function buildPanelContent(stats: Awaited<ReturnType<typeof getStats>>) {
  const { session, total, pending, designed, ready, posted } = stats;
  const statusBadge = session.isOpen ? '🟢 <b>BUKA</b>' : '🔴 <b>TUTUP</b>';
  const remaining = Math.max(0, session.quotaTotal - total);

  const text = `<b>🎛️ PANEL KONTROL PENGURUS HIMASEFESS</b>
──────────────────────────────
📌 <b>Status Songfess:</b> ${statusBadge}
🎫 <b>Nomor Sesi:</b> <code>Sesi #${session.sessionNumber}</code>
🎯 <b>Kuota Terisi:</b> <b>${total}</b> / ${session.quotaTotal} (Sisa: <b>${remaining}</b>)
⏰ <b>Jam Tayang:</b> ${session.operatingHours}

📊 <b>Status Kiriman Saat Ini:</b>
• ⏳ Pending: <b>${pending}</b>
• 🎨 Designed: <b>${designed}</b>
• ✅ Siap Tayang: <b>${ready}</b>
• 🚀 Sudah Post: <b>${posted}</b>
──────────────────────────────
<i>Gunakan tombol di bawah untuk kontrol cepat:</i>`;

  const toggleBtnText = session.isOpen ? '🔴 Tutup Sesi Songfess' : '🟢 Buka Sesi Songfess';

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: toggleBtnText, callback_data: 'ctrl:toggle_session' }
      ],
      [
        { text: '➕ Sesi Berikutnya (+1)', callback_data: 'ctrl:session_plus1' },
        { text: '🔄 Refresh Data', callback_data: 'ctrl:refresh_panel' }
      ],
      [
        { text: `⏳ Antrean Pending (${pending})`, callback_data: 'ctrl:list_pending' }
      ],
      [
        { text: '🔢 Kuota 30', callback_data: 'ctrl:set_quota:30' },
        { text: '🔢 Kuota 50', callback_data: 'ctrl:set_quota:50' },
        { text: '🔢 Kuota 100', callback_data: 'ctrl:set_quota:100' }
      ],
      [
        { text: '🌐 Buka Web Admin Panel', url: 'http://localhost:5173/?admin=himase2026' }
      ]
    ]
  };

  return { text, replyMarkup };
}

function buildSubmissionButtons(trackingCode: string) {
  return {
    inline_keyboard: [
      [
        { text: '🎨 Tandai Designed', callback_data: `mod:designed:${trackingCode}` },
        { text: '✅ Siap Tayang (Ready)', callback_data: `mod:ready:${trackingCode}` }
      ],
      [
        { text: '🚀 Sudah Tayang (Posted)', callback_data: `mod:posted:${trackingCode}` },
        { text: '❌ Tolak (Reject)', callback_data: `mod:reject:${trackingCode}` }
      ]
    ]
  };
}

// Command Handlers
async function handleCommand(chatId: number | string, text: string, username?: string) {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg1 = parts[1];
  const arg2 = parts.slice(2).join(' ');

  switch (cmd) {
    case '/start':
    case '/help': {
      const helpMsg = `<b>🤖 BOT KONTROL PENGURUS HIMASEFESS</b>
Selamat bertugas, <b>@${username || 'Pengurus'}</b>!

Berikut daftar perintah yang dapat kamu gunakan:

<b>🎛️ KONTROL SESI & KUOTA</b>
• <code>/panel</code> atau <code>/menu</code> : Buka panel kontrol interaktif (lengkap dengan tombol)
• <code>/buka</code> : Buka sesi pengiriman Songfess
• <code>/tutup</code> : Tutup sesi pengiriman Songfess
• <code>/status</code> : Cek status sesi & ringkasan statistik
• <code>/sesi &lt;nomor&gt;</code> : Set nomor sesi (contoh: <code>/sesi 2</code>)
• <code>/kuota &lt;jumlah&gt;</code> : Set batas kuota (contoh: <code>/kuota 60</code>)
• <code>/jam &lt;teks&gt;</code> : Set jam tayang (contoh: <code>/jam 19:00 – 23:00 WIB</code>)

<b>📋 MODERASI KIRIMAN</b>
• <code>/pending</code> : Lihat 5 kiriman pending terbaru beserta tombol aksi
• <code>/detail &lt;kode&gt;</code> : Cek detail kiriman (contoh: <code>/detail SF-2026-1234</code>)
• <code>/design &lt;kode&gt;</code> : Tandai kiriman sudah di-design
• <code>/ready &lt;kode&gt;</code> : Tandai kiriman siap tayang (Approved)
• <code>/posted &lt;kode&gt;</code> : Tandai kiriman sudah diposting ke IG
• <code>/reject &lt;kode&gt; &lt;alasan&gt;</code> : Tolak kiriman dengan alasan

<i>💡 Tips: Kamu juga bisa klik tombol di bawah notifikasi kiriman baru untuk moderasi instan.</i>`;
      await sendMessage(chatId, helpMsg);
      break;
    }

    case '/menu':
    case '/panel': {
      const stats = await getStats();
      const { text: panelText, replyMarkup } = buildPanelContent(stats);
      await sendMessage(chatId, panelText, replyMarkup);
      break;
    }

    case '/buka':
    case '/buka_songfess': {
      await updateSessionData({ isOpen: true });
      const stats = await getStats();
      await sendMessage(
        chatId, 
        `🟢 <b>Sesi Songfess #${stats.session.sessionNumber} BERHASIL DIBUKA!</b>\n` +
        `Pengunjung sekarang dapat mengisi formulir Songfess di website.`
      );
      break;
    }

    case '/tutup':
    case '/tutup_songfess': {
      await updateSessionData({ isOpen: false });
      const stats = await getStats();
      await sendMessage(
        chatId, 
        `🔴 <b>Sesi Songfess #${stats.session.sessionNumber} TELAH DITUTUP.</b>\n` +
        `Formulir Songfess di website sekarang dikunci dan meminta user memantau story IG @se.cretfess.`
      );
      break;
    }

    case '/status': {
      const stats = await getStats();
      const statusBadge = stats.session.isOpen ? '🟢 BUKA' : '🔴 TUTUP';
      const remaining = Math.max(0, stats.session.quotaTotal - stats.total);

      const msg = `<b>📊 STATUS HIMASEFESS SAAT INI</b>
──────────────────────────────
• <b>Sesi:</b> <code>#${stats.session.sessionNumber}</code> (${statusBadge})
• <b>Kuota:</b> ${stats.total} / ${stats.session.quotaTotal} (Sisa: ${remaining})
• <b>Jam Buka:</b> ${stats.session.operatingHours}

<b>Statistik Moderasi:</b>
• ⏳ Pending: <b>${stats.pending}</b>
• 🎨 Designed: <b>${stats.designed}</b>
• ✅ Siap Tayang (Ready): <b>${stats.ready}</b>
• 🚀 Sudah Tayang (Posted): <b>${stats.posted}</b>
• ❌ Ditolak (Rejected): <b>${stats.rejected}</b>
──────────────────────────────`;
      await sendMessage(chatId, msg);
      break;
    }

    case '/sesi': {
      const num = parseInt(arg1);
      if (isNaN(num) || num < 1) {
        await sendMessage(chatId, '⚠️ Format salah. Gunakan: <code>/sesi &lt;nomor&gt;</code> (contoh: <code>/sesi 2</code>)');
        return;
      }
      await updateSessionData({ sessionNumber: num });
      await sendMessage(chatId, `✅ <b>Nomor Sesi berhasil diubah menjadi: Sesi #${num}</b>`);
      break;
    }

    case '/kuota': {
      const quota = parseInt(arg1);
      if (isNaN(quota) || quota < 1) {
        await sendMessage(chatId, '⚠️ Format salah. Gunakan: <code>/kuota &lt;jumlah&gt;</code> (contoh: <code>/kuota 50</code>)');
        return;
      }
      await updateSessionData({ quotaTotal: quota });
      await sendMessage(chatId, `✅ <b>Maksimal Kuota berhasil diubah menjadi: ${quota} kiriman</b>`);
      break;
    }

    case '/jam': {
      const hours = parts.slice(1).join(' ').trim();
      if (!hours) {
        await sendMessage(chatId, '⚠️ Format salah. Gunakan: <code>/jam 18:00 – 23:00 WIB</code>');
        return;
      }
      await updateSessionData({ operatingHours: hours });
      await sendMessage(chatId, `✅ <b>Jam Operasional diubah menjadi: ${hours}</b>`);
      break;
    }

    case '/pending': {
      const q = query(
        collection(db, 'submissions'), 
        where('status', '==', 'PENDING'), 
        orderBy('createdAt', 'desc'), 
        limit(5)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        await sendMessage(chatId, '🎉 <b>Tidak ada antrean kiriman pending saat ini!</b> Semua kiriman telah dimoderasi.');
        return;
      }

      await sendMessage(chatId, `⏳ <b>Daftar ${snap.size} Kiriman Pending Terbaru:</b>`);

      for (const docSnap of snap.docs) {
        const item = { ...(docSnap.data() as SubmissionItem), id: docSnap.id };
        let msg = `<b>[${item.type.toUpperCase()}]</b> <code>#${item.trackingCode}</code>\n`;
        msg += `<b>Untuk:</b> ${item.recipient} | <b>Dari:</b> ${item.isAnonymous ? '<i>Anonim</i>' : item.senderAlias}\n`;
        if (item.songData) {
          msg += `<b>Lagu:</b> ${item.songData.title} (${item.songData.artist})\n`;
        }
        msg += `<b>Pesan:</b> <i>"${item.message}"</i>`;
        
        await sendMessage(chatId, msg, buildSubmissionButtons(item.trackingCode));
      }
      break;
    }

    case '/detail': {
      if (!arg1) {
        await sendMessage(chatId, '⚠️ Masukkan kode tiket. Contoh: <code>/detail SF-2026-1234</code>');
        return;
      }
      const item = await findSubmissionByCode(arg1);
      if (!item) {
        await sendMessage(chatId, `❌ Kiriman dengan kode <code>#${arg1}</code> tidak ditemukan.`);
        return;
      }

      let detailMsg = `<b>DETAIL KIRIMAN #${item.trackingCode}</b>\n`;
      detailMsg += `──────────────────────────────\n`;
      detailMsg += `<b>Tipe:</b> ${item.type.toUpperCase()}\n`;
      detailMsg += `<b>Status:</b> <b>${item.status}</b>\n`;
      detailMsg += `<b>Penerima:</b> ${item.recipient}\n`;
      detailMsg += `<b>Pengirim:</b> ${item.isAnonymous ? '<i>Anonim</i>' : item.senderAlias}\n`;
      detailMsg += `<b>Kategori:</b> ${item.category}\n\n`;

      if (item.songData) {
        detailMsg += `<b>Lagu:</b> ${item.songData.title}\n`;
        detailMsg += `<b>Artis:</b> ${item.songData.artist}\n`;
        if (item.songData.formattedTimeRange) {
          detailMsg += `<b>Potongan Musik:</b> ${item.songData.formattedTimeRange}\n`;
        }
        if (item.songData.youtubeUrl) {
          detailMsg += `<b>Link:</b> <a href="${item.songData.youtubeUrl}">YouTube Video</a>\n`;
        }
        detailMsg += `\n`;
      }

      detailMsg += `<b>Isi Pesan:</b>\n<blockquote>${item.message}</blockquote>\n`;
      if (item.statusNote) {
        detailMsg += `\n<b>Catatan Status:</b> <i>${item.statusNote}</i>\n`;
      }

      await sendMessage(chatId, detailMsg, buildSubmissionButtons(item.trackingCode));
      break;
    }

    case '/design':
    case '/ready':
    case '/approve':
    case '/posted':
    case '/reject': {
      if (!arg1) {
        await sendMessage(chatId, `⚠️ Masukkan kode tiket. Contoh: <code>${cmd} SF-2026-1234</code>`);
        return;
      }

      const item = await findSubmissionByCode(arg1);
      if (!item) {
        await sendMessage(chatId, `❌ Kiriman dengan kode <code>#${arg1}</code> tidak ditemukan.`);
        return;
      }

      let newStatus: SubmissionItem['status'] = 'READY';
      let note = `Di-update oleh @${username || 'pengurus'} via Telegram`;

      if (cmd === '/design') {
        newStatus = 'DESIGNED';
        note = `Desain kartu sedang diproses oleh @${username || 'pengurus'}`;
      } else if (cmd === '/posted') {
        newStatus = 'POSTED';
        note = `Sudah diposting ke story @se.cretfess`;
      } else if (cmd === '/reject') {
        newStatus = 'REJECTED';
        note = arg2 || 'Ditolak: Konten tidak sesuai panduan komunitas.';
      }

      await updateDoc(doc(db, 'submissions', item.id), {
        status: newStatus,
        statusNote: note,
        reviewedAt: new Date().toISOString()
      });

      await sendMessage(chatId, `✅ <b>Tiket #${item.trackingCode} berhasil diubah statusnya menjadi: ${newStatus}</b>\nCatatan: <i>${note}</i>`);
      break;
    }

    default:
      await sendMessage(chatId, '❓ Perintah tidak dikenal. Ketik <code>/help</code> untuk panduan lengkap atau <code>/panel</code> untuk membuka tombol kontrol.');
  }
}

// Callback Query Handler (Untuk tombol interaktif)
async function handleCallbackQuery(cb: {
  id: string;
  from: { id: number; username?: string; first_name?: string };
  message?: { message_id: number; chat: { id: number | string }; text?: string };
  data?: string;
}) {
  const data = cb.data || '';
  const fromUser = cb.from.username ? `@${cb.from.username}` : (cb.from.first_name || 'Pengurus');
  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;

  if (!chatId || !messageId) {
    await answerCallbackQuery(cb.id, 'Pesan tidak valid');
    return;
  }

  // 1. Tombol Panel Kontrol (ctrl:*)
  if (data === 'ctrl:toggle_session') {
    const session = await getSessionData();
    const newOpenState = !session.isOpen;
    await updateSessionData({ isOpen: newOpenState });
    
    await answerCallbackQuery(cb.id, `Sesi Songfess sekarang: ${newOpenState ? 'DIBUKA 🟢' : 'DITUTUP 🔴'}`);
    
    const stats = await getStats();
    const { text, replyMarkup } = buildPanelContent(stats);
    await editMessageText(chatId, messageId, text, replyMarkup);
    return;
  }

  if (data === 'ctrl:session_plus1') {
    const session = await getSessionData();
    const newNumber = session.sessionNumber + 1;
    await updateSessionData({ sessionNumber: newNumber });
    
    await answerCallbackQuery(cb.id, `Nomor Sesi dinaikkan ke #${newNumber} ➕`);
    
    const stats = await getStats();
    const { text, replyMarkup } = buildPanelContent(stats);
    await editMessageText(chatId, messageId, text, replyMarkup);
    return;
  }

  if (data === 'ctrl:refresh_panel') {
    await answerCallbackQuery(cb.id, 'Data panel berhasil diperbarui 🔄');
    const stats = await getStats();
    const { text, replyMarkup } = buildPanelContent(stats);
    await editMessageText(chatId, messageId, text, replyMarkup);
    return;
  }

  if (data === 'ctrl:list_pending') {
    await answerCallbackQuery(cb.id, 'Mengambil daftar antrean pending...');
    await handleCommand(chatId, '/pending', cb.from.username);
    return;
  }

  if (data.startsWith('ctrl:set_quota:')) {
    const quota = parseInt(data.replace('ctrl:set_quota:', ''));
    if (!isNaN(quota)) {
      await updateSessionData({ quotaTotal: quota });
      await answerCallbackQuery(cb.id, `Batas kuota diubah ke ${quota} kiriman`);
      const stats = await getStats();
      const { text, replyMarkup } = buildPanelContent(stats);
      await editMessageText(chatId, messageId, text, replyMarkup);
    }
    return;
  }

  // 2. Tombol Moderasi Kiriman (mod:*)
  if (data.startsWith('mod:')) {
    const parts = data.split(':');
    const action = parts[1];
    const code = parts[2];

    const item = await findSubmissionByCode(code);
    if (!item) {
      await answerCallbackQuery(cb.id, `Tiket #${code} tidak ditemukan`, true);
      return;
    }

    let targetStatus: SubmissionItem['status'] = 'READY';
    let statusText = 'SIAP TAYANG (READY)';
    let note = `Disetujui oleh ${fromUser}`;

    if (action === 'designed' || action === 'design') {
      targetStatus = 'DESIGNED';
      statusText = 'DESIGNED 🎨';
      note = `Sedang di-design oleh ${fromUser}`;
    } else if (action === 'ready' || action === 'approve') {
      targetStatus = 'READY';
      statusText = 'SIAP TAYANG (READY) ✅';
      note = `Disetujui & siap tayang oleh ${fromUser}`;
    } else if (action === 'posted') {
      targetStatus = 'POSTED';
      statusText = 'SUDAH TAYANG (POSTED) 🚀';
      note = `Telah diposting ke IG oleh ${fromUser}`;
    } else if (action === 'reject' || action.startsWith('reject_')) {
      targetStatus = 'REJECTED';
      statusText = 'DITOLAK (REJECTED) ❌';
      note = action === 'reject_sara' 
        ? `Ditolak (${fromUser}): Melanggar ketentuan SARA / Bullying` 
        : action === 'reject_privacy' 
          ? `Ditolak (${fromUser}): Melanggar privasi / Doxxing`
          : `Ditolak oleh ${fromUser}`;
    }

    await updateDoc(doc(db, 'submissions', item.id), {
      status: targetStatus,
      statusNote: note,
      reviewedAt: new Date().toISOString()
    });

    await answerCallbackQuery(cb.id, `Tiket #${code} diubah jadi: ${statusText}`);

    // Update pesan Telegram agar jelas siapa yang memoderasi
    const originalText = cb.message?.text || '';
    const updatedBanner = `\n\n📌 <b>STATUS TERBARU:</b> [${statusText}]\n👤 <b>Moderator:</b> ${fromUser}\n📝 <i>${note}</i>`;
    
    // Tampilkan tombol sisa yang relevan
    const nextButtons = {
      inline_keyboard: [
        [
          { text: '🎨 Designed', callback_data: `mod:designed:${code}` },
          { text: '✅ Ready', callback_data: `mod:ready:${code}` },
          { text: '🚀 Posted', callback_data: `mod:posted:${code}` }
        ]
      ]
    };

    await editMessageText(chatId, messageId, originalText + updatedBanner, nextButtons);
    return;
  }

  await answerCallbackQuery(cb.id);
}

// Long Polling Bot Runner
async function runLongPolling() {
  console.log('====================================================');
  console.log('🤖 TELEGRAM BOT CONTROLLER HIMASEFESS AKTIF');
  console.log(`📡 Proyek Firebase: ${firebaseConfig.projectId}`);
  console.log(`👥 Chat ID Pengurus Terdaftar: ${ALLOWED_CHAT_IDS.join(', ') || 'Semua Chat (Open)'}`);
  console.log('====================================================');
  console.log('Bot sedang mendengarkan pesan dan tombol interaktif...\n');

  let offset = 0;

  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API_URL}/getUpdates?offset=${offset}&timeout=25`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          // 1. Pesan Teks / Perintah
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const fromId = update.message.from?.id;
            const username = update.message.from?.username;

            if (!isAuthorized(chatId, fromId)) {
              console.warn(`[Security] Unauthorized access attempt from chat_id: ${chatId}`);
              await sendMessage(chatId, '⛔ <b>Akses Ditolak:</b> Akun atau grup Telegram kamu belum terdaftar dalam daftar pengurus HIMASE.');
              continue;
            }

            console.log(`[Message] From: @${username || fromId} | Text: "${update.message.text}"`);
            await handleCommand(chatId, update.message.text, username);
          }

          // 2. Tombol Interaktif (Callback Query)
          if (update.callback_query) {
            const cb = update.callback_query;
            const chatId = cb.message?.chat.id;
            const fromId = cb.from.id;

            if (chatId && !isAuthorized(chatId, fromId)) {
              console.warn(`[Security] Unauthorized callback attempt from chat_id: ${chatId}`);
              await answerCallbackQuery(cb.id, 'Akses Ditolak: Kamu tidak memiliki izin.', true);
              continue;
            }

            console.log(`[Button Click] From: @${cb.from.username || fromId} | Data: "${cb.data}"`);
            await handleCallbackQuery(cb);
          }
        }
      }
    } catch (pollErr) {
      console.warn('[Polling Error]', pollErr);
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

// Start Bot
runLongPolling().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
