import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Initialize Firebase SDK for server-side backup
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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.VITE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId || botToken.includes('your_') || chatId.includes('your_')) {
      return res.status(500).json({ error: 'Telegram credentials not configured on server' });
    }

    const payload = req.body?.telegramPayload;
    if (!payload || !payload.text) {
      return res.status(400).json({ error: 'Missing telegramPayload' });
    }

    // Server-side backup: Save submission to Firestore directly in case client-side failed
    if (req.body?.submission?.trackingCode) {
      try {
        const sub = req.body.submission;
        const cleanCode = sub.trackingCode.trim().toUpperCase().replace(/^#/, '');
        await setDoc(doc(db, 'submissions', cleanCode), {
          ...sub,
          trackingCode: cleanCode,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`[notify-telegram] Backup saved #${cleanCode} to Firestore`);
      } catch (dbErr) {
        console.warn('[notify-telegram Firestore backup warning]:', dbErr.message);
      }
    }

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.text,
        parse_mode: payload.parse_mode || 'HTML',
        reply_markup: payload.reply_markup
      })
    });

    const data = await telegramRes.json();
    return res.status(telegramRes.status).json(data);
  } catch (err) {
    console.error('[API notify-telegram error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
