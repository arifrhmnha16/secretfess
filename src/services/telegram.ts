import type { Submission } from '../types';

/**
 * Service for Telegram Bot Integration.
 * 
 * SECURITY BEST PRACTICE:
 * In accordance with strict security standards, the Telegram Bot Token (TELEGRAM_BOT_TOKEN) 
 * is NEVER exposed in the frontend client application.
 * All outbound bot notifications and inline keyboard callbacks are sent either through:
 * 1. A secure backend proxy / Firebase Cloud Function (e.g., `POST /api/notify-telegram`)
 * 2. In local development / demo mode, logged into the simulation console.
 */

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramNotificationPayload {
  chat_id?: string;
  parse_mode: 'HTML' | 'MarkdownV2';
  text: string;
  reply_markup: {
    inline_keyboard: Array<Array<TelegramInlineButton>>;
  };
}

export const telegramService = {
  /**
   * Generates the Telegram message text formatted in HTML
   */
  formatTelegramMessage(submission: Submission): string {
    const isSong = submission.type === 'songfess';
    const typeLabel = isSong ? '<b>[NEW SONGFESS] 🎵</b>' : '<b>[NEW MENFESS] 💌</b>';
    const dateStr = new Date(submission.createdAt).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    let messageBody = `${typeLabel}\n\n`;
    messageBody += `<b>Kode Tiket:</b> <code>#${submission.trackingCode}</code>\n`;
    messageBody += `<b>Waktu:</b> ${dateStr} WIB\n`;
    messageBody += `<b>Untuk:</b> ${submission.recipient}\n`;
    messageBody += `<b>Dari:</b> ${submission.isAnonymous ? '<i>Anonim</i>' : (submission.senderAlias || '<i>Anonim</i>')}\n\n`;

    if (isSong && submission.songData) {
      messageBody += `<b>Lagu (YouTube):</b> ${submission.songData.title}\n`;
      messageBody += `<b>Channel / Artis:</b> ${submission.songData.artist}\n`;
      if (submission.songData.formattedTimeRange) {
        messageBody += `<b>Potongan Musik:</b> ${submission.songData.formattedTimeRange} (${submission.songData.duration || 15}s)\n`;
      } else if (submission.songData.startTime !== undefined) {
        const start = submission.songData.startTime;
        const end = submission.songData.endTime || (start + (submission.songData.duration || 15));
        messageBody += `<b>Potongan Musik:</b> ${start}s – ${end}s\n`;
      }
      if (submission.songData.youtubeUrl) {
        messageBody += `<b>Link YouTube:</b> <a href="${submission.songData.youtubeUrl}">${submission.songData.youtubeUrl}</a>\n`;
      }
      messageBody += `\n`;
    }

    messageBody += `<b>Pesan Pengirim:</b>\n`;
    messageBody += `<blockquote>${submission.message}</blockquote>\n\n`;
    messageBody += `<i>Pilih aksi moderasi melalui tombol di bawah:</i>`;

    return messageBody;
  },

  /**
   * Generates interactive inline keyboard buttons for Telegram moderator group
   */
  getInlineKeyboard(trackingCode: string) {
    const adminUrl = typeof window !== 'undefined' && window.location?.origin 
      ? `${window.location.origin}/?admin=himase2026` 
      : 'https://secretfess.vercel.app/?admin=himase2026';

    return {
      inline_keyboard: [
        [
          { text: '🖼️ Generate Desain Kartu (Kirim ke Grup) 📥', callback_data: `mod:generate:${trackingCode}` }
        ],
        [
          { text: '🎨 Tandai Designed', callback_data: `mod:designed:${trackingCode}` },
          { text: '✅ Siap Tayang (Ready)', callback_data: `mod:ready:${trackingCode}` }
        ],
        [
          { text: '🚀 Sudah Tayang (Posted)', callback_data: `mod:posted:${trackingCode}` },
          { text: '❌ Tolak (Reject)', callback_data: `mod:reject:${trackingCode}` }
        ],
        [
          { text: '🌐 Dashboard Web Admin', url: adminUrl }
        ]
      ]
    };
  },

  /**
   * Dispatches the notification to backend webhook or logs simulation
   */
  async notifyTelegramGroup(submission: Submission): Promise<{ success: boolean; simulated: boolean; payload: TelegramNotificationPayload }> {
    const payload: TelegramNotificationPayload = {
      parse_mode: 'HTML',
      text: this.formatTelegramMessage(submission),
      reply_markup: this.getInlineKeyboard(submission.trackingCode)
    };

    // 1. Opsi Serverless Proxy /api/notify-telegram (Prioritas: Bebas CORS & adblocker)
    try {
      const proxyRes = await fetch('/api/notify-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission,
          telegramPayload: payload
        })
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data.ok) {
          console.log('[Telegram Bot Proxy] Notifikasi terkirim via serverless API:', data.result?.message_id);
          return { success: true, simulated: false, payload };
        }
      }
    } catch {
      // Serverless endpoint not reachable (e.g. standalone local vite dev), continue to direct API
    }

    // 2. Opsi Langsung ke Telegram Bot API (Fallback)
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

    if (botToken && chatId && !botToken.includes('your_') && !chatId.includes('your_')) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: payload.text,
            parse_mode: payload.parse_mode,
            reply_markup: payload.reply_markup
          })
        });

        const data = await response.json();
        if (data.ok) {
          console.log('[Telegram Bot] Notifikasi berhasil terkirim langsung ke grup:', data.result?.message_id);
          return { success: true, simulated: false, payload };
        } else {
          console.warn('[Telegram Bot API Error]:', data.description || data);
        }
      } catch (err) {
        console.warn('[Telegram Bot API Network Error]:', err);
      }
    }

    // Development / Client-Side Simulated Dispatcher
    console.group(`[Telegram Bot Dispatcher Simulator]`);
    console.log(`Pesan berhasil diformat untuk grup moderasi pengurus HIMASE:`);
    console.log(`HTML Payload:\n`, payload.text);
    console.log(`Inline Buttons:`, payload.reply_markup.inline_keyboard);
    console.groupEnd();

    return {
      success: true,
      simulated: true,
      payload
    };
  }
};
