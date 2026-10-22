import type { Submission } from '../types';

/**
 * Service for Cloudinary Asset Storage & Card Rendering.
 */

export const cloudinaryService = {
  getCloudName(): string {
    return import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  },

  getUploadPreset(): string {
    return import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
  },

  isConfigured(): boolean {
    const cloudName = this.getCloudName();
    return Boolean(cloudName && cloudName !== 'your_cloud_name');
  },

  /**
   * Uploads an image blob or dataURL to Cloudinary using unsigned upload preset
   */
  async uploadCardImage(blobOrDataUrl: Blob | string, trackingCode: string): Promise<string | null> {
    const cloudName = this.getCloudName();
    const preset = this.getUploadPreset();

    if (!cloudName || !preset) {
      console.info('Cloudinary credentials not set in .env. Card saved locally.');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', blobOrDataUrl);
      formData.append('upload_preset', preset);
      formData.append('public_id', `himasefess_${trackingCode}`);
      formData.append('folder', 'himasefess_cards');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Cloudinary upload failed with status ${res.status}`);
      }

      const data = await res.json();
      return data.secure_url || data.url;
    } catch (err) {
      console.error('Error uploading to Cloudinary:', err);
      return null;
    }
  },

  /**
   * Generates a downloadable high-resolution Instagram Card:
   * - Menfess: 4:5 ratio (1080x1350)
   * - Songfess: 9:16 ratio (1080x1920) with top safe space for story info
   */
  async exportStoryCanvas(submission: Submission): Promise<string> {
    const isMenfess = submission.type === 'menfess';
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = isMenfess ? 1350 : 1920;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    const width = canvas.width;
    const height = canvas.height;

    // Background Cream
    ctx.fillStyle = '#FAF7F2';
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid pattern
    ctx.strokeStyle = 'rgba(45, 22, 14, 0.04)';
    ctx.lineWidth = 2;
    for (let x = 0; x < width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (isMenfess) {
      // ==========================================
      // MENFESS: 4:5 RATIO (1080 x 1350)
      // ==========================================
      // Header branding
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Se.Cretfess • HIMASE', 540, 100);

      ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#6B5248';
      ctx.fillText(`#${submission.trackingCode}`, 540, 140);

      // Card Dimensions
      const cardX = 80;
      const cardY = 180;
      const cardW = 920;
      const cardH = 1020;
      const r = 36;

      // Drop shadow
      ctx.fillStyle = '#2D160E';
      ctx.beginPath();
      ctx.roundRect(cardX + 14, cardY + 14, cardW, cardH, r);
      ctx.fill();

      // Card Body
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, r);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Recipient Pill
      ctx.fillStyle = '#FFAEC8';
      ctx.beginPath();
      ctx.roundRect(cardX + 50, cardY + 50, 420, 58, 29);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Untuk: ${submission.recipient.slice(0, 24)}`, cardX + 75, cardY + 89);

      // Message text
      ctx.font = 'bold 38px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#2D160E';
      const words = submission.message.split(' ');
      let line = '';
      let textY = cardY + 180;
      const maxWidth = cardW - 100;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, cardX + 50, textY);
          line = words[n] + ' ';
          textY += 58;
          if (textY > cardY + cardH - 160) {
            ctx.fillText('...', cardX + 50, textY);
            break;
          }
        } else {
          line = testLine;
        }
      }
      if (textY <= cardY + cardH - 160) {
        ctx.fillText(line, cardX + 50, textY);
      }

      // Sender signature
      ctx.fillStyle = '#E85B88';
      ctx.font = 'italic 700 28px "Plus Jakarta Sans", sans-serif';
      const sender = submission.isAnonymous ? 'Dari: Seseorang yang mengagumi dalam diam' : `Dari: ${submission.senderAlias}`;
      ctx.fillText(sender, cardX + 50, cardY + cardH - 60);

      // Watermark
      ctx.fillStyle = '#6B5248';
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('@se.cretfess • HIMASE 2026', 540, 1260);

    } else {
      // ==========================================
      // SONGFESS: 9:16 RATIO (1080 x 1920)
      // Generous top safe space (360px) for Story header/profile
      // ==========================================
      const cardX = 90;
      const cardY = 380; // Safe space from top for Instagram header
      const cardW = 900;
      const cardH = 1380;
      const r = 44;

      // Header watermark just above card
      ctx.fillStyle = '#6B5248';
      ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${submission.trackingCode}`, 540, cardY - 40);

      // Drop shadow
      ctx.fillStyle = '#2D160E';
      ctx.beginPath();
      ctx.roundRect(cardX + 16, cardY + 16, cardW, cardH, r);
      ctx.fill();

      // Card Body
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, r);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Recipient Pill
      ctx.fillStyle = '#FFAEC8';
      ctx.beginPath();
      ctx.roundRect(cardX + 50, cardY + 60, 480, 64, 32);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Didedikasikan untuk: ${submission.recipient.slice(0, 18)}`, cardX + 75, cardY + 103);

      // Outer Frame Box that holds the 1:1 music box (taller height, maintained width)
      const centerX = cardX + cardW / 2;
      const outerW = 760;
      const outerH = 680;
      const outerX = centerX - outerW / 2;
      const outerY = cardY + 280;

      // Drop shadow for outer box
      ctx.fillStyle = '#2D160E';
      ctx.beginPath();
      ctx.roundRect(outerX + 12, outerY + 12, outerW, outerH, 32);
      ctx.fill();

      // Body of outer box
      ctx.fillStyle = '#FAF8F5';
      ctx.beginPath();
      ctx.roundRect(outerX, outerY, outerW, outerH, 32);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Compact 1:1 Square Box inside (smaller, shifted up)
      const boxSize = 310;
      const boxX = centerX - boxSize / 2;
      const boxY = outerY + 45; // Shifted up to leave space below for manual title

      // Drop shadow for inner 1:1 box
      ctx.fillStyle = '#2D160E';
      ctx.beginPath();
      ctx.roundRect(boxX + 7, boxY + 7, boxSize, boxSize, 22);
      ctx.fill();

      // Body of inner 1:1 box
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxSize, boxSize, 22);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Title & Artist
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      const songTitle = submission.songData?.title || 'Judul Lagu Pilihan';
      ctx.fillText(songTitle.length > 20 ? songTitle.slice(0, 20) + '...' : songTitle, centerX, boxY + 110);

      ctx.fillStyle = '#6B5248';
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      const songArtist = submission.songData?.artist || 'Nama Artis / Band';
      ctx.fillText(songArtist.length > 24 ? songArtist.slice(0, 24) + '...' : songArtist, centerX, boxY + 150);

      // Timestamp Pill
      const timeLabel = submission.songData?.formattedTimeRange || submission.songData?.favoriteTimestamp || '00:00 - 00:15';
      ctx.fillStyle = '#FAF8F5';
      ctx.beginPath();
      ctx.roundRect(centerX - 130, boxY + 205, 260, 44, 22);
      ctx.fill();
      ctx.strokeStyle = 'rgba(45, 22, 14, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#E85B88';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⏱️ ${timeLabel} (${submission.songData?.duration || 15}s)`, centerX, boxY + 233);

      // Sender Info inside card
      ctx.textAlign = 'left';
      ctx.fillStyle = '#E85B88';
      ctx.font = 'italic 700 30px "Plus Jakarta Sans", sans-serif';
      const sender = submission.isAnonymous ? 'Dari: Seseorang yang mengagumi dalam diam' : `Dari: ${submission.senderAlias}`;
      ctx.fillText(sender, cardX + 50, cardY + cardH - 70);

      // Watermark at bottom
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('@se.cretfess', 540, 1830);
    }

    return canvas.toDataURL('image/png');
  }
};
