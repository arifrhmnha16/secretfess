import { initializeApp, getApps } from 'firebase/app';
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

// Initialize Firebase SDK
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Telegram API Helper Functions
async function callTelegram(method, body) {
  try {
    const res = await fetch(`${TELEGRAM_API_URL}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error(`[Telegram Webhook Error: ${method}]`, err);
    return null;
  }
}

async function sendChatAction(chatId, action = 'typing') {
  return callTelegram('sendChatAction', {
    chat_id: chatId,
    action: action
  });
}

async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text || '',
    show_alert: showAlert
  });
}

async function sendMessage(chatId, text, replyMarkup, replyToMessageId) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {}),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function sendPhoto(chatId, photoUrl, caption, replyMarkup, replyToMessageId) {
  return callTelegram('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption || '',
    parse_mode: 'HTML',
    ...(replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {}),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function editMessageText(chatId, messageId, text, replyMarkup) {
  return callTelegram('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function deleteMessage(chatId, messageId) {
  if (!chatId || !messageId) return null;
  return callTelegram('deleteMessage', {
    chat_id: chatId,
    message_id: messageId
  });
}

// Resilient memory cache in case of restricted Firestore rules or network delays
const memorySession = {
  isOpen: true,
  sessionNumber: 1,
  quotaTotal: 50,
  operatingHours: '18:00 – 23:00 WIB',
  title: 'HIMASEFESS',
  announcement: ''
};

async function safeSaveSession(updates) {
  Object.assign(memorySession, updates);
  try {
    const sessionRef = doc(db, 'config', 'session');
    await setDoc(sessionRef, updates, { merge: true });
    return { ok: true };
  } catch (err) {
    console.warn('[Firestore safeSaveSession warning]:', err.message);
    return { ok: false, error: err.message };
  }
}

async function safeUpdateSubmission(id, updates) {
  try {
    await updateDoc(doc(db, 'submissions', id), updates);
    return { ok: true };
  } catch (err) {
    console.warn('[Firestore safeUpdateSubmission warning]:', err.message);
    return { ok: false, error: err.message };
  }
}

async function findSubmissionByCode(code, fallbackMessageText) {
  if (!code) return null;
  const clean = code.trim().toUpperCase().replace(/^#/, '');
  
  // 1. Coba cari di Firestore lewat query trackingCode
  try {
    const q = query(collection(db, 'submissions'), where('trackingCode', '==', clean), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { ...d.data(), id: d.id };
    }
    // Coba langsung lewat doc ID
    const directDoc = await getDoc(doc(db, 'submissions', clean));
    if (directDoc.exists()) {
      return { ...directDoc.data(), id: directDoc.id };
    }
  } catch (err) {
    console.warn('[Firestore findSubmission warning]:', err.message);
  }

  // 2. Cek apakah gambar kartu sudah ter-upload di Cloudinary
  const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dzkopapli';
  const expectedCloudUrl = `https://res.cloudinary.com/${cloudName}/image/upload/himasefess_cards/himasefess_${clean}`;
  
  let hasCloudImage = false;
  try {
    const headRes = await fetch(expectedCloudUrl, { method: 'HEAD' });
    if (headRes.ok) {
      hasCloudImage = true;
    }
  } catch (e) {
    console.warn('Cloudinary HEAD check warning:', e.message);
  }

  // Jika ada teks pesan dari Telegram atau gambar Cloudinary ditemukan, auto-rekonstruksi kiriman
  if (fallbackMessageText || hasCloudImage) {
    let recipient = 'Pengunjung';
    let senderAlias = 'Anonim';
    let message = 'Pesan Songfess';
    let isSong = false;
    let songData = null;

    if (fallbackMessageText) {
      if (fallbackMessageText.includes('[NEW SONGFESS]')) isSong = true;
      const matchRecipient = fallbackMessageText.match(/Untuk:\s*(.+)/i);
      if (matchRecipient) recipient = matchRecipient[1].trim();

      const matchSender = fallbackMessageText.match(/Dari:\s*(.+)/i);
      if (matchSender) senderAlias = matchSender[1].replace(/<[^>]+>/g, '').trim();

      const matchBlock = fallbackMessageText.match(/<blockquote>([\s\S]*?)<\/blockquote>/i);
      if (matchBlock) {
        message = matchBlock[1].trim();
      } else {
        const matchPesan = fallbackMessageText.match(/Pesan Pengirim:\s*\n*"?([^"]+)"?/i);
        if (matchPesan) message = matchPesan[1].trim();
      }

      const matchLagu = fallbackMessageText.match(/Lagu[^:]*:\s*(.+)/i);
      const matchArtis = fallbackMessageText.match(/Channel \/ Artis:\s*(.+)/i);
      if (matchLagu || matchArtis) {
        songData = {
          title: matchLagu ? matchLagu[1].trim() : 'Musik Pilihan',
          artist: matchArtis ? matchArtis[1].trim() : 'Artist'
        };
      }
    }

    const recovered = {
      id: clean,
      trackingCode: clean,
      type: isSong ? 'songfess' : 'menfess',
      recipient,
      senderAlias,
      isAnonymous: senderAlias.toLowerCase() === 'anonim',
      message,
      songData,
      cardImageUrl: hasCloudImage ? expectedCloudUrl : null,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    // Auto-save recovered item ke Firestore
    try {
      await setDoc(doc(db, 'submissions', clean), recovered, { merge: true });
    } catch (saveErr) {
      console.warn('Recovered item auto-save warning:', saveErr.message);
    }

    return recovered;
  }

  return null;
}

async function getSessionData() {
  try {
    const sessionRef = doc(db, 'config', 'session');
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      const data = snap.data();
      const loaded = {
        isOpen: data.isOpen ?? memorySession.isOpen,
        sessionNumber: data.sessionNumber === 12 ? 1 : (data.sessionNumber || memorySession.sessionNumber),
        quotaTotal: data.quotaTotal || memorySession.quotaTotal,
        operatingHours: data.operatingHours || memorySession.operatingHours,
        title: data.title || memorySession.title,
        announcement: data.announcement || memorySession.announcement
      };
      Object.assign(memorySession, loaded);
      return loaded;
    }
  } catch (err) {
    console.warn('[Firestore getSession warning]:', err.message);
  }

  return { ...memorySession };
}

async function getStats() {
  const session = await getSessionData();
  
  let total = 0;
  let pending = 0;
  let designed = 0;
  let ready = 0;
  let posted = 0;
  let rejected = 0;
  let hasDbError = false;

  try {
    const subsSnap = await getDocs(collection(db, 'submissions'));
    subsSnap.forEach((docSnap) => {
      total++;
      const st = docSnap.data().status;
      if (st === 'PENDING') pending++;
      else if (st === 'DESIGNED') designed++;
      else if (st === 'READY') ready++;
      else if (st === 'POSTED') posted++;
      else if (st === 'REJECTED') rejected++;
    });
  } catch (err) {
    hasDbError = true;
    console.warn('[Firestore getStats warning]:', err.message);
  }

  return { session, total, pending, designed, ready, posted, rejected, hasDbError };
}

function buildPanelContent(stats) {
  const { session, total, pending, designed, ready, posted, hasDbError } = stats;
  const statusBadge = session.isOpen ? '🟢 <b>BUKA</b>' : '🔴 <b>TUTUP</b>';
  const remaining = Math.max(0, session.quotaTotal - total);

  let text = `<b>🎛️ PANEL KONTROL PENGURUS HIMASEFESS</b>\n`;
  text += `──────────────────────────────\n`;
  text += `📌 <b>Status Songfess:</b> ${statusBadge}\n`;
  text += `🎫 <b>Nomor Sesi:</b> <code>Sesi #${session.sessionNumber}</code>\n`;
  text += `🎯 <b>Kuota Terisi:</b> <b>${total}</b> / ${session.quotaTotal} (Sisa: <b>${remaining}</b>)\n`;
  text += `⏰ <b>Jam Tayang:</b> ${session.operatingHours}\n\n`;
  text += `📊 <b>Status Kiriman Saat Ini:</b>\n`;
  text += `• ⏳ Pending: <b>${pending}</b>\n`;
  text += `• 🎨 Designed: <b>${designed}</b>\n`;
  text += `• ✅ Siap Tayang: <b>${ready}</b>\n`;
  text += `• 🚀 Sudah Post: <b>${posted}</b>\n`;
  text += `──────────────────────────────\n`;
  if (hasDbError) {
    text += `⚠️ <i>Catatan: Database Firestore mengaktifkan aturan proteksi. Mode fallback aktif.</i>\n`;
  }
  text += `<i>Gunakan tombol di bawah untuk kontrol instan:</i>`;

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
        { text: '🌐 Buka Dashboard Web Admin', url: 'https://secretfess.vercel.app/?admin=himase2026' }
      ]
    ]
  };

  return { text, replyMarkup };
}

function buildSubmissionButtons(trackingCode) {
  const cleanCode = trackingCode.trim().toUpperCase().replace(/^#/, '');
  return {
    inline_keyboard: [
      [
        { text: '🖼️ Generate Desain Kartu (Kirim ke Grup) 📥', callback_data: `mod:generate:${cleanCode}` }
      ],
      [
        { text: '🎨 Tandai Designed', callback_data: `mod:designed:${cleanCode}` },
        { text: '✅ Siap Tayang (Ready)', callback_data: `mod:ready:${cleanCode}` }
      ],
      [
        { text: '🚀 Sudah Tayang (Posted)', callback_data: `mod:posted:${cleanCode}` },
        { text: '❌ Tolak (Reject)', callback_data: `mod:reject:${cleanCode}` }
      ]
    ]
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Telegram Webhook Endpoint Ready' });
  }

  const update = req.body;
  if (!update) {
    return res.status(400).json({ error: 'No update payload' });
  }

  try {
    // =========================================================================
    // 1. HANDLE CALLBACK QUERIES (INTERACTIVE INLINE BUTTONS)
    // =========================================================================
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data || '';
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      const fromUser = cb.from?.username ? `@${cb.from.username}` : (cb.from?.first_name || 'Pengurus');

      // A. GENERATE DESAIN KARTU & KIRIM GAMBAR LANGSUNG KE GRUP
      if (data.startsWith('mod:generate:') || data.startsWith('mod:generate_image:')) {
        const code = data.replace('mod:generate:', '').replace('mod:generate_image:', '').trim();
        
        // 1. Respon feedback instan di Telegram
        await answerCallbackQuery(cb.id, '⏳ Sedang meng-generate gambar kartu, mohon tunggu...');
        await sendChatAction(chatId, 'upload_photo');

        // 2. Beri pesan notifikasi progress sementara di chat
        const progressMsg = await sendMessage(
          chatId, 
          `⏳ <b>Sedang memproses desain kartu #${code}...</b>\nBot sedang menyiapkan dan mengunggah gambar resolusi tinggi ke grup.`, 
          null, 
          messageId
        );

        const fallbackText = cb.message?.text || cb.message?.caption || '';
        const item = await findSubmissionByCode(code, fallbackText);
        if (!item) {
          if (progressMsg?.result?.message_id) await deleteMessage(chatId, progressMsg.result.message_id);
          await sendMessage(chatId, `❌ Kiriman dengan kode <code>#${code}</code> tidak ditemukan di database.`, null, messageId);
          return res.status(200).json({ ok: true });
        }

        const isSong = item.type === 'songfess';
        let caption = `🖼️ <b>KARTU STORY INSTAGRAM #${item.trackingCode}</b>\n`;
        caption += `──────────────────────────────\n`;
        caption += `📌 <b>Tipe:</b> ${isSong ? 'Songfess 🎵' : 'Menfess 💌'}\n`;
        caption += `👤 <b>Untuk:</b> ${item.recipient}\n`;
        caption += `💌 <b>Dari:</b> ${item.isAnonymous ? '<i>Anonim</i>' : item.senderAlias}\n`;
        if (isSong && item.songData) {
          caption += `🎶 <b>Lagu:</b> ${item.songData.title} (${item.songData.artist})\n`;
          if (item.songData.formattedTimeRange) {
            caption += `⏱️ <b>Potongan Musik:</b> ${item.songData.formattedTimeRange}\n`;
          }
        }
        caption += `\n💬 <b>Pesan:</b>\n<blockquote>${item.message}</blockquote>\n`;
        caption += `──────────────────────────────\n`;
        caption += `<i>✅ Foto siap disimpan langsung ke galeri & diposting ke Instagram Story!</i>`;

        const actionButtons = {
          inline_keyboard: [
            [
              { text: '🎨 Tandai Designed', callback_data: `mod:designed:${item.trackingCode}` },
              { text: '✅ Siap Tayang (Ready)', callback_data: `mod:ready:${item.trackingCode}` }
            ],
            [
              { text: '🚀 Sudah Tayang (Posted)', callback_data: `mod:posted:${item.trackingCode}` }
            ]
          ]
        };

        if (item.cardImageUrl) {
          // Kirim foto resolusi tinggi langsung ke grup
          const photoRes = await sendPhoto(chatId, item.cardImageUrl, caption, actionButtons, messageId);
          if (photoRes && photoRes.ok) {
            if (progressMsg?.result?.message_id) {
              await deleteMessage(chatId, progressMsg.result.message_id);
            }
            return res.status(200).json({ ok: true });
          }
        }

        // Fallback jika gambar cloud belum tersedia
        if (progressMsg?.result?.message_id) await deleteMessage(chatId, progressMsg.result.message_id);
        const previewUrl = `https://secretfess.vercel.app/?admin=himase2026&preview=${item.trackingCode}`;
        await sendMessage(
          chatId,
          `${caption}\n\n⚠️ <i>Gambar kartu belum sempat di-render otomatis ke cloud. Klik tombol di bawah untuk membuka kartu dan unduh PNG HD:</i>`,
          {
            inline_keyboard: [
              [{ text: '📥 Buka & Unduh Kartu HD', url: previewUrl }],
              ...actionButtons.inline_keyboard
            ]
          },
          messageId
        );

        return res.status(200).json({ ok: true });
      }

      // B. MODERASI STATUS (Designed, Ready, Posted, Reject)
      if (data.startsWith('mod:')) {
        const parts = data.split(':');
        const action = parts[1];
        const code = parts[2];

        // 1. Berikan notifikasi proses instan ke Telegram
        await answerCallbackQuery(cb.id, `⏳ Sedang memproses update status #${code}...`);
        await sendChatAction(chatId, 'typing');

        const fallbackText = cb.message?.text || cb.message?.caption || '';
        const item = await findSubmissionByCode(code, fallbackText);
        if (!item) {
          await answerCallbackQuery(cb.id, `Tiket #${code} tidak ditemukan`, true);
          return res.status(200).json({ ok: true });
        }

        let targetStatus = 'READY';
        let statusText = 'SIAP TAYANG (READY) ✅';
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
        } else if (action.startsWith('reject')) {
          targetStatus = 'REJECTED';
          statusText = 'DITOLAK (REJECTED) ❌';
          note = `Ditolak oleh ${fromUser}`;
        }

        await safeUpdateSubmission(item.id, {
          status: targetStatus,
          statusNote: note,
          reviewedAt: new Date().toISOString()
        });

        await answerCallbackQuery(cb.id, `✅ Tiket #${code}: ${statusText}`);

        const originalText = cb.message?.text || cb.message?.caption || '';
        const updatedNotice = `\n\n📌 <b>STATUS TERBARU:</b> [${statusText}]\n👤 <b>Moderator:</b> ${fromUser}\n📝 <i>${note}</i>`;
        
        const nextButtons = {
          inline_keyboard: [
            [
              { text: '🖼️ Generate Desain Kartu (Kirim ke Grup) 📥', callback_data: `mod:generate:${code}` }
            ],
            [
              { text: '🎨 Designed', callback_data: `mod:designed:${code}` },
              { text: '✅ Ready', callback_data: `mod:ready:${code}` },
              { text: '🚀 Posted', callback_data: `mod:posted:${code}` }
            ]
          ]
        };

        if (chatId && messageId) {
          await editMessageText(chatId, messageId, originalText + updatedNotice, nextButtons);
        }

        return res.status(200).json({ ok: true });
      }

      // C. PANEL CONTROLLER BUTTONS (Toggle Sesi, +1 Sesi, Refresh, Kuota)
      if (data === 'ctrl:toggle_session') {
        await answerCallbackQuery(cb.id, '⏳ Sedang mengubah status sesi...');
        await sendChatAction(chatId, 'typing');

        const session = await getSessionData();
        const newOpen = !session.isOpen;
        await safeSaveSession({ isOpen: newOpen });

        await answerCallbackQuery(cb.id, `Status Sesi sekarang: ${newOpen ? 'DIBUKA 🟢' : 'DITUTUP 🔴'}`);
        const stats = await getStats();
        const { text, replyMarkup } = buildPanelContent(stats);
        await editMessageText(chatId, messageId, text, replyMarkup);
        return res.status(200).json({ ok: true });
      }

      if (data === 'ctrl:session_plus1') {
        await answerCallbackQuery(cb.id, '⏳ Sedang menambah nomor sesi...');
        await sendChatAction(chatId, 'typing');

        const session = await getSessionData();
        const newNumber = session.sessionNumber + 1;
        await safeSaveSession({ sessionNumber: newNumber });

        await answerCallbackQuery(cb.id, `Nomor Sesi dinaikkan ke #${newNumber} ➕`);
        const stats = await getStats();
        const { text, replyMarkup } = buildPanelContent(stats);
        await editMessageText(chatId, messageId, text, replyMarkup);
        return res.status(200).json({ ok: true });
      }

      if (data === 'ctrl:refresh_panel') {
        await answerCallbackQuery(cb.id, '🔄 Memperbarui ringkasan data...');
        await sendChatAction(chatId, 'typing');

        const stats = await getStats();
        const { text, replyMarkup } = buildPanelContent(stats);
        await editMessageText(chatId, messageId, text, replyMarkup);
        return res.status(200).json({ ok: true });
      }

      if (data === 'ctrl:list_pending') {
        await answerCallbackQuery(cb.id, '⏳ Mengambil antrean kiriman pending...');
        await sendChatAction(chatId, 'typing');

        let pendingItems = [];
        try {
          const q = query(
            collection(db, 'submissions'), 
            where('status', '==', 'PENDING'), 
            orderBy('createdAt', 'desc'), 
            limit(5)
          );
          const snap = await getDocs(q);
          pendingItems = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        } catch (err) {
          console.warn('[ctrl:list_pending Firestore warning]:', err.message);
        }

        if (pendingItems.length === 0) {
          await sendMessage(chatId, '🎉 <b>Tidak ada antrean kiriman pending saat ini!</b> Semua kiriman telah diproses.', null, messageId);
          return res.status(200).json({ ok: true });
        }

        await sendMessage(chatId, `⏳ <b>Daftar ${pendingItems.length} Kiriman Pending Terbaru:</b>`, null, messageId);
        for (const item of pendingItems) {
          let msg = `<b>[${item.type.toUpperCase()}]</b> <code>#${item.trackingCode}</code>\n`;
          msg += `<b>Untuk:</b> ${item.recipient} | <b>Dari:</b> ${item.isAnonymous ? '<i>Anonim</i>' : item.senderAlias}\n`;
          if (item.songData) {
            msg += `<b>Lagu:</b> ${item.songData.title} (${item.songData.artist})\n`;
          }
          msg += `<b>Pesan:</b> <i>"${item.message}"</i>`;
          await sendMessage(chatId, msg, buildSubmissionButtons(item.trackingCode));
        }
        return res.status(200).json({ ok: true });
      }

      if (data.startsWith('ctrl:set_quota:')) {
        const quota = parseInt(data.replace('ctrl:set_quota:', ''));
        if (!isNaN(quota)) {
          await answerCallbackQuery(cb.id, `⏳ Sedang mengatur kuota ke ${quota}...`);
          await sendChatAction(chatId, 'typing');

          await safeSaveSession({ quotaTotal: quota });
          const stats = await getStats();
          const { text, replyMarkup } = buildPanelContent(stats);
          await editMessageText(chatId, messageId, text, replyMarkup);
        }
        return res.status(200).json({ ok: true });
      }
    }

    // =========================================================================
    // 2. HANDLE MESSAGE COMMANDS (/buka, /tutup, /status, /panel, /generate, dll)
    // =========================================================================
    if (update.message && update.message.text) {
      const msg = update.message;
      const text = msg.text.trim();
      const chatId = msg.chat.id;
      const parts = text.split(/\s+/);
      
      // Hapus bot suffix grup (misal: /buka@himasefess_bot -> /buka)
      const rawCmd = parts[0].toLowerCase();
      const cmd = rawCmd.split('@')[0];
      const arg1 = parts[1];
      const arg2 = parts.slice(2).join(' ');
      const username = msg.from?.username || msg.from?.first_name || 'Pengurus';

      // Pastikan hanya memproses command yang diawali slash '/'
      if (!cmd.startsWith('/')) {
        return res.status(200).json({ ok: true });
      }

      // Berikan chat action "typing" seketika
      await sendChatAction(chatId, 'typing');

      // Command: /start atau /help
      if (cmd === '/start' || cmd === '/help') {
        const helpMsg = `<b>🤖 BOT KONTROL PENGURUS HIMASEFESS</b>
Selamat bertugas, <b>@${username}</b>!

Berikut daftar perintah yang dapat kamu gunakan:

<b>🎛️ KONTROL SESI & KUOTA</b>
• <code>/panel</code> atau <code>/menu</code> : Buka panel kontrol interaktif (lengkap dengan tombol)
• <code>/buka</code> : Buka sesi pengiriman Songfess
• <code>/tutup</code> : Tutup sesi pengiriman Songfess
• <code>/status</code> : Cek status sesi & ringkasan statistik
• <code>/sesi &lt;nomor&gt;</code> : Set nomor sesi (contoh: <code>/sesi 2</code>)
• <code>/kuota &lt;jumlah&gt;</code> : Set batas kuota (contoh: <code>/kuota 60</code>)
• <code>/jam &lt;teks&gt;</code> : Set jam tayang (contoh: <code>/jam 19:00 – 23:00 WIB</code>)

<b>📋 MODERASI & GENERATE DESAIN</b>
• <code>/generate &lt;kode&gt;</code> : Minta bot kirim foto desain kartu langsung ke grup (contoh: <code>/generate SF-2026-8691</code>)
• <code>/pending</code> : Lihat kiriman pending terbaru beserta tombol aksi
• <code>/detail &lt;kode&gt;</code> : Cek detail kiriman (contoh: <code>/detail SF-2026-8691</code>)
• <code>/design &lt;kode&gt;</code> : Tandai kiriman sudah di-design
• <code>/ready &lt;kode&gt;</code> : Tandai kiriman siap tayang (Approved)
• <code>/posted &lt;kode&gt;</code> : Tandai kiriman sudah diposting ke IG
• <code>/reject &lt;kode&gt; &lt;alasan&gt;</code> : Tolak kiriman dengan alasan

<i>💡 Tips: Klik tombol di bawah notifikasi kiriman baru untuk moderasi & kirim foto desain instan.</i>`;
        await sendMessage(chatId, helpMsg, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /menu atau /panel
      if (cmd === '/menu' || cmd === '/panel') {
        const stats = await getStats();
        const { text: panelText, replyMarkup } = buildPanelContent(stats);
        await sendMessage(chatId, panelText, replyMarkup, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /generate atau /unduh
      if (cmd === '/generate' || cmd === '/unduh') {
        if (!arg1) {
          await sendMessage(chatId, '⚠️ Masukkan kode tiket. Contoh: <code>/generate SF-2026-8691</code>', null, msg.message_id);
          return res.status(200).json({ ok: true });
        }

        await sendChatAction(chatId, 'upload_photo');
        const progressMsg = await sendMessage(
          chatId, 
          `⏳ <b>Sedang memproses desain kartu #${arg1}...</b>\nBot sedang menyiapkan dan mengunggah gambar resolusi tinggi ke grup.`, 
          null, 
          msg.message_id
        );

        const item = await findSubmissionByCode(arg1);
        if (!item) {
          if (progressMsg?.result?.message_id) await deleteMessage(chatId, progressMsg.result.message_id);
          await sendMessage(chatId, `❌ Kiriman dengan kode <code>#${arg1}</code> tidak ditemukan di database.`, null, msg.message_id);
          return res.status(200).json({ ok: true });
        }

        if (item.cardImageUrl) {
          await sendPhoto(
            chatId, 
            item.cardImageUrl, 
            `🖼️ <b>Desain Kartu #${item.trackingCode}</b>\n• <b>Untuk:</b> ${item.recipient}\n• <b>Dari:</b> ${item.isAnonymous ? 'Anonim' : item.senderAlias}\n\nSiap diposting ke Instagram Story! 🚀`,
            buildSubmissionButtons(item.trackingCode),
            msg.message_id
          );
          if (progressMsg?.result?.message_id) await deleteMessage(chatId, progressMsg.result.message_id);
        } else {
          if (progressMsg?.result?.message_id) await deleteMessage(chatId, progressMsg.result.message_id);
          const previewUrl = `https://secretfess.vercel.app/?admin=himase2026&preview=${item.trackingCode}`;
          await sendMessage(
            chatId,
            `🖼️ <b>Generate Desain #${item.trackingCode}</b>\nBuka link untuk unduh kartu HD: ${previewUrl}`,
            {
              inline_keyboard: [[{ text: '📥 Unduh Kartu HD', url: previewUrl }]]
            },
            msg.message_id
          );
        }
        return res.status(200).json({ ok: true });
      }

      // Command: /buka
      if (cmd === '/buka' || cmd === '/buka_songfess') {
        const saveRes = await safeSaveSession({ isOpen: true });
        const stats = await getStats();
        let reply = `🟢 <b>Sesi Songfess #${stats.session.sessionNumber} BERHASIL DIBUKA!</b>\nPengunjung sekarang dapat mengisi formulir Songfess di website.`;
        if (!saveRes.ok) {
          reply += `\n\n⚠️ <i>(Info: Database Firestore masih memerlukan update rules ke allow read, write: if true; agar tersimpan permanen di cloud)</i>`;
        }
        await sendMessage(chatId, reply, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /tutup
      if (cmd === '/tutup' || cmd === '/tutup_songfess') {
        const saveRes = await safeSaveSession({ isOpen: false });
        const stats = await getStats();
        let reply = `🔴 <b>Sesi Songfess #${stats.session.sessionNumber} TELAH DITUTUP.</b>\nFormulir Songfess di website sekarang dikunci.`;
        if (!saveRes.ok) {
          reply += `\n\n⚠️ <i>(Info: Database Firestore masih memerlukan update rules ke allow read, write: if true; agar tersimpan permanen di cloud)</i>`;
        }
        await sendMessage(chatId, reply, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /status
      if (cmd === '/status') {
        const stats = await getStats();
        const statusBadge = stats.session.isOpen ? '🟢 BUKA' : '🔴 TUTUP';
        const remaining = Math.max(0, stats.session.quotaTotal - stats.total);

        let statusMsg = `<b>📊 STATUS HIMASEFESS SAAT INI</b>\n`;
        statusMsg += `──────────────────────────────\n`;
        statusMsg += `• <b>Sesi:</b> <code>#${stats.session.sessionNumber}</code> (${statusBadge})\n`;
        statusMsg += `• <b>Kuota:</b> ${stats.total} / ${stats.session.quotaTotal} (Sisa: ${remaining})\n`;
        statusMsg += `• <b>Jam Buka:</b> ${stats.session.operatingHours}\n\n`;
        statusMsg += `<b>Statistik Moderasi:</b>\n`;
        statusMsg += `• ⏳ Pending: <b>${stats.pending}</b>\n`;
        statusMsg += `• 🎨 Designed: <b>${stats.designed}</b>\n`;
        statusMsg += `• ✅ Siap Tayang (Ready): <b>${stats.ready}</b>\n`;
        statusMsg += `• 🚀 Sudah Tayang (Posted): <b>${stats.posted}</b>\n`;
        statusMsg += `• ❌ Ditolak (Rejected): <b>${stats.rejected}</b>\n`;
        statusMsg += `──────────────────────────────`;
        if (stats.hasDbError) {
          statusMsg += `\n⚠️ <i>(Firestore Rules di Firebase Console sedang terkunci; pastikan diatur ke allow read, write: if true;)</i>`;
        }
        await sendMessage(chatId, statusMsg, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /sesi <nomor>
      if (cmd === '/sesi') {
        const num = parseInt(arg1);
        if (isNaN(num) || num < 1) {
          await sendMessage(chatId, '⚠️ Format salah. Gunakan: <code>/sesi &lt;nomor&gt;</code> (contoh: <code>/sesi 2</code>)', null, msg.message_id);
          return res.status(200).json({ ok: true });
        }
        await safeSaveSession({ sessionNumber: num });
        await sendMessage(chatId, `✅ <b>Nomor Sesi berhasil diubah menjadi: Sesi #${num}</b>`, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /kuota <jumlah>
      if (cmd === '/kuota') {
        const quota = parseInt(arg1);
        if (isNaN(quota) || quota < 1) {
          await sendMessage(chatId, '⚠️ Format salah. Gunakan: <code>/kuota &lt;jumlah&gt;</code> (contoh: <code>/kuota 50</code>)', null, msg.message_id);
          return res.status(200).json({ ok: true });
        }
        await safeSaveSession({ quotaTotal: quota });
        await sendMessage(chatId, `✅ <b>Maksimal Kuota berhasil diubah menjadi: ${quota} kiriman</b>`, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /jam <teks>
      if (cmd === '/jam') {
        const hours = parts.slice(1).join(' ').trim();
        if (!hours) {
          await sendMessage(chatId, '⚠️ Format salah. Gunakan: <code>/jam 18:00 – 23:00 WIB</code>', null, msg.message_id);
          return res.status(200).json({ ok: true });
        }
        await safeSaveSession({ operatingHours: hours });
        await sendMessage(chatId, `✅ <b>Jam Operasional diubah menjadi: ${hours}</b>`, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /pending
      if (cmd === '/pending') {
        const progMsg = await sendMessage(chatId, '⏳ <i>Sedang mengambil daftar antrean pending...</i>', null, msg.message_id);
        
        let pendingItems = [];
        try {
          const q = query(
            collection(db, 'submissions'), 
            where('status', '==', 'PENDING'), 
            orderBy('createdAt', 'desc'), 
            limit(5)
          );
          const snap = await getDocs(q);
          pendingItems = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        } catch (err) {
          console.warn('[Firestore /pending warning]:', err.message);
        }

        if (progMsg?.result?.message_id) await deleteMessage(chatId, progMsg.result.message_id);

        if (pendingItems.length === 0) {
          await sendMessage(chatId, '🎉 <b>Tidak ada antrean kiriman pending saat ini!</b> Semua kiriman telah diproses.', null, msg.message_id);
          return res.status(200).json({ ok: true });
        }

        await sendMessage(chatId, `⏳ <b>Daftar ${pendingItems.length} Kiriman Pending Terbaru:</b>`, null, msg.message_id);
        for (const item of pendingItems) {
          let pMsg = `<b>[${item.type.toUpperCase()}]</b> <code>#${item.trackingCode}</code>\n`;
          pMsg += `<b>Untuk:</b> ${item.recipient} | <b>Dari:</b> ${item.isAnonymous ? '<i>Anonim</i>' : item.senderAlias}\n`;
          if (item.songData) {
            pMsg += `<b>Lagu:</b> ${item.songData.title} (${item.songData.artist})\n`;
          }
          pMsg += `<b>Pesan:</b> <i>"${item.message}"</i>`;
          await sendMessage(chatId, pMsg, buildSubmissionButtons(item.trackingCode));
        }
        return res.status(200).json({ ok: true });
      }

      // Command: /detail <kode>
      if (cmd === '/detail') {
        if (!arg1) {
          await sendMessage(chatId, '⚠️ Masukkan kode tiket. Contoh: <code>/detail SF-2026-1234</code>', null, msg.message_id);
          return res.status(200).json({ ok: true });
        }

        const progMsg = await sendMessage(chatId, `⏳ <i>Mencari data #${arg1}...</i>`, null, msg.message_id);
        const item = await findSubmissionByCode(arg1);
        if (progMsg?.result?.message_id) await deleteMessage(chatId, progMsg.result.message_id);

        if (!item) {
          await sendMessage(chatId, `❌ Kiriman dengan kode <code>#${arg1}</code> tidak ditemukan di database.`, null, msg.message_id);
          return res.status(200).json({ ok: true });
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
        }
        detailMsg += `<b>Isi Pesan:</b>\n<blockquote>${item.message}</blockquote>\n`;
        if (item.statusNote) {
          detailMsg += `\n<b>Catatan Status:</b> <i>${item.statusNote}</i>\n`;
        }

        await sendMessage(chatId, detailMsg, buildSubmissionButtons(item.trackingCode), msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command moderasi: /ready, /approve, /design, /posted, /reject
      if (cmd === '/ready' || cmd === '/approve' || cmd === '/design' || cmd === '/posted' || cmd === '/reject') {
        if (!arg1) {
          await sendMessage(chatId, `⚠️ Masukkan kode tiket. Contoh: <code>${cmd} SF-2026-1234</code>`, null, msg.message_id);
          return res.status(200).json({ ok: true });
        }

        const progMsg = await sendMessage(chatId, `⏳ <i>Memproses update status #${arg1}...</i>`, null, msg.message_id);
        const item = await findSubmissionByCode(arg1);
        if (progMsg?.result?.message_id) await deleteMessage(chatId, progMsg.result.message_id);

        if (!item) {
          await sendMessage(chatId, `❌ Kiriman dengan kode <code>#${arg1}</code> tidak ditemukan di database.`, null, msg.message_id);
          return res.status(200).json({ ok: true });
        }

        let newStatus = 'READY';
        let note = `Di-update oleh @${username} via Telegram`;

        if (cmd === '/design') {
          newStatus = 'DESIGNED';
          note = `Desain kartu sedang diproses oleh @${username}`;
        } else if (cmd === '/posted') {
          newStatus = 'POSTED';
          note = `Sudah diposting ke story @se.cretfess`;
        } else if (cmd === '/reject') {
          newStatus = 'REJECTED';
          note = arg2 || 'Ditolak: Konten tidak sesuai panduan komunitas.';
        }

        await safeUpdateSubmission(item.id, {
          status: newStatus,
          statusNote: note,
          reviewedAt: new Date().toISOString()
        });

        await sendMessage(chatId, `✅ <b>Tiket #${item.trackingCode} berhasil diubah statusnya menjadi: ${newStatus}</b>\nCatatan: <i>${note}</i>`, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Fallback untuk command asing yang diawali '/'
      await sendMessage(
        chatId, 
        `❓ Perintah <code>${cmd}</code> tidak dikenali.\nKetik <code>/help</code> atau <code>/panel</code> untuk membuka daftar fitur kontrol bot.`, 
        null, 
        msg.message_id
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Webhook error]:', err);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
