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

// Initialize Firebase
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
  return callTelegram('deleteMessage', {
    chat_id: chatId,
    message_id: messageId
  });
}

async function findSubmissionByCode(code) {
  if (!code) return null;
  const clean = code.trim().toUpperCase().replace(/^#/, '');
  const q = query(collection(db, 'submissions'), where('trackingCode', '==', clean), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { ...d.data(), id: d.id };
  }
  return null;
}

async function getSessionData() {
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

  return { session, total, pending, designed, ready, posted, rejected };
}

function buildPanelContent(stats) {
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
<i>Gunakan tombol di bawah untuk kontrol instan:</i>`;

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
        const code = data.replace('mod:generate:', '').replace('mod:generate_image:', '');
        
        // 1. Berikan respon visual cepat di Telegram
        await answerCallbackQuery(cb.id, '⏳ Sedang memproses & mengirim gambar kartu ke grup...');
        await sendChatAction(chatId, 'upload_photo');

        // 2. Beri notifikasi chat bahwa proses sedang berjalan
        const progressMsg = await sendMessage(chatId, `⏳ <b>Sedang memproses desain kartu #${code}...</b>\nBot sedang mengambil gambar resolusi tinggi untuk dikirim ke grup.`, null, messageId);

        const item = await findSubmissionByCode(code);
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
            // Hapus pesan progress sementara agar chat tetap rapi
            if (progressMsg?.result?.message_id) {
              await deleteMessage(chatId, progressMsg.result.message_id);
            }
            return res.status(200).json({ ok: true });
          }
        }

        // Fallback jika belum sempat di-upload
        if (progressMsg?.result?.message_id) await deleteMessage(chatId, progressMsg.result.message_id);
        const previewUrl = `https://secretfess.vercel.app/?admin=himase2026&preview=${item.trackingCode}`;
        await sendMessage(
          chatId,
          `${caption}\n\n⚠️ <i>Gambar belum selesai di-cache di cloud. Klik tombol di bawah untuk membuka kartu dan unduh PNG HD:</i>`,
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

        await answerCallbackQuery(cb.id, `⏳ Sedang mengupdate status #${code}...`);
        await sendChatAction(chatId, 'typing');

        const item = await findSubmissionByCode(code);
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

        await updateDoc(doc(db, 'submissions', item.id), {
          status: targetStatus,
          statusNote: note,
          reviewedAt: new Date().toISOString()
        });

        await answerCallbackQuery(cb.id, `Tiket #${code}: ${statusText}`);

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
        await answerCallbackQuery(cb.id, '⏳ Mengubah status sesi...');
        const sessionRef = doc(db, 'config', 'session');
        const snap = await getDoc(sessionRef);
        const isOpen = snap.exists() ? Boolean(snap.data().isOpen) : true;
        const newOpen = !isOpen;
        await setDoc(sessionRef, { isOpen: newOpen }, { merge: true });

        await answerCallbackQuery(cb.id, `Status Sesi sekarang: ${newOpen ? 'DIBUKA 🟢' : 'DITUTUP 🔴'}`);
        const stats = await getStats();
        const { text, replyMarkup } = buildPanelContent(stats);
        await editMessageText(chatId, messageId, text, replyMarkup);
        return res.status(200).json({ ok: true });
      }

      if (data === 'ctrl:session_plus1') {
        await answerCallbackQuery(cb.id, '⏳ Menambah nomor sesi...');
        const session = await getSessionData();
        const newNumber = session.sessionNumber + 1;
        await setDoc(doc(db, 'config', 'session'), { sessionNumber: newNumber }, { merge: true });

        await answerCallbackQuery(cb.id, `Nomor Sesi dinaikkan ke #${newNumber} ➕`);
        const stats = await getStats();
        const { text, replyMarkup } = buildPanelContent(stats);
        await editMessageText(chatId, messageId, text, replyMarkup);
        return res.status(200).json({ ok: true });
      }

      if (data === 'ctrl:refresh_panel') {
        await answerCallbackQuery(cb.id, '🔄 Memperbarui data...');
        const stats = await getStats();
        const { text, replyMarkup } = buildPanelContent(stats);
        await editMessageText(chatId, messageId, text, replyMarkup);
        return res.status(200).json({ ok: true });
      }

      if (data === 'ctrl:list_pending') {
        await answerCallbackQuery(cb.id, '⏳ Mengambil kiriman pending...');
        const q = query(
          collection(db, 'submissions'), 
          where('status', '==', 'PENDING'), 
          orderBy('createdAt', 'desc'), 
          limit(5)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          await sendMessage(chatId, '🎉 <b>Tidak ada antrean kiriman pending saat ini!</b> Semua kiriman telah dimoderasi.', null, messageId);
          return res.status(200).json({ ok: true });
        }

        await sendMessage(chatId, `⏳ <b>Daftar ${snap.size} Kiriman Pending Terbaru:</b>`, null, messageId);
        for (const docSnap of snap.docs) {
          const item = { ...docSnap.data(), id: docSnap.id };
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
          await answerCallbackQuery(cb.id, `⏳ Mengatur kuota ke ${quota}...`);
          await setDoc(doc(db, 'config', 'session'), { quotaTotal: quota }, { merge: true });
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
      
      // Hapus bot suffix (misal: /buka@himasefess_bot -> /buka)
      const rawCmd = parts[0].toLowerCase();
      const cmd = rawCmd.split('@')[0];
      const arg1 = parts[1];
      const arg2 = parts.slice(2).join(' ');
      const username = msg.from?.username || msg.from?.first_name || 'Pengurus';

      // Status indicator saat mengetik
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
• <code>/pending</code> : Lihat 5 kiriman pending terbaru beserta tombol aksi
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
        const progressMsg = await sendMessage(chatId, `⏳ <b>Sedang memproses desain kartu #${arg1}...</b>`, null, msg.message_id);

        const item = await findSubmissionByCode(arg1);
        if (!item) {
          if (progressMsg?.result?.message_id) await deleteMessage(chatId, progressMsg.result.message_id);
          await sendMessage(chatId, `❌ Kiriman dengan kode <code>#${arg1}</code> tidak ditemukan.`, null, msg.message_id);
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
        await setDoc(doc(db, 'config', 'session'), { isOpen: true }, { merge: true });
        const stats = await getStats();
        await sendMessage(chatId, `🟢 <b>Sesi Songfess #${stats.session.sessionNumber} BERHASIL DIBUKA!</b>\nPengunjung sekarang dapat mengisi formulir Songfess di website.`, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /tutup
      if (cmd === '/tutup' || cmd === '/tutup_songfess') {
        await setDoc(doc(db, 'config', 'session'), { isOpen: false }, { merge: true });
        const stats = await getStats();
        await sendMessage(chatId, `🔴 <b>Sesi Songfess #${stats.session.sessionNumber} TELAH DITUTUP.</b>\nFormulir Songfess di website sekarang dikunci.`, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /status
      if (cmd === '/status') {
        const stats = await getStats();
        const statusBadge = stats.session.isOpen ? '🟢 BUKA' : '🔴 TUTUP';
        const remaining = Math.max(0, stats.session.quotaTotal - stats.total);

        const statusMsg = `<b>📊 STATUS HIMASEFESS SAAT INI</b>
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
        await setDoc(doc(db, 'config', 'session'), { sessionNumber: num }, { merge: true });
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
        await setDoc(doc(db, 'config', 'session'), { quotaTotal: quota }, { merge: true });
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
        await setDoc(doc(db, 'config', 'session'), { operatingHours: hours }, { merge: true });
        await sendMessage(chatId, `✅ <b>Jam Operasional diubah menjadi: ${hours}</b>`, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }

      // Command: /pending
      if (cmd === '/pending') {
        const q = query(
          collection(db, 'submissions'), 
          where('status', '==', 'PENDING'), 
          orderBy('createdAt', 'desc'), 
          limit(5)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          await sendMessage(chatId, '🎉 <b>Tidak ada antrean kiriman pending saat ini!</b> Semua kiriman telah dimoderasi.', null, msg.message_id);
          return res.status(200).json({ ok: true });
        }

        await sendMessage(chatId, `⏳ <b>Daftar ${snap.size} Kiriman Pending Terbaru:</b>`, null, msg.message_id);
        for (const docSnap of snap.docs) {
          const item = { ...docSnap.data(), id: docSnap.id };
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
        const item = await findSubmissionByCode(arg1);
        if (!item) {
          await sendMessage(chatId, `❌ Kiriman dengan kode <code>#${arg1}</code> tidak ditemukan.`, null, msg.message_id);
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

        const item = await findSubmissionByCode(arg1);
        if (!item) {
          await sendMessage(chatId, `❌ Kiriman dengan kode <code>#${arg1}</code> tidak ditemukan.`, null, msg.message_id);
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

        await updateDoc(doc(db, 'submissions', item.id), {
          status: newStatus,
          statusNote: note,
          reviewedAt: new Date().toISOString()
        });

        await sendMessage(chatId, `✅ <b>Tiket #${item.trackingCode} berhasil diubah statusnya menjadi: ${newStatus}</b>\nCatatan: <i>${note}</i>`, null, msg.message_id);
        return res.status(200).json({ ok: true });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Webhook error]:', err);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
