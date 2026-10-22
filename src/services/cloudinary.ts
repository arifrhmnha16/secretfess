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

    const themeColors: Record<string, { cardBg: string; accentBg: string; accentText: string }> = {
      matcha: { cardBg: '#FAFAF7', accentBg: '#D8F3DC', accentText: '#2D5A34' },
      caramel: { cardBg: '#FDFBF7', accentBg: '#FEEAA1', accentText: '#664E19' },
      lavender: { cardBg: '#FAF8FC', accentBg: '#EADCF8', accentText: '#503170' },
      pink_cream: { cardBg: '#FFFFFF', accentBg: '#FFAEC8', accentText: '#2D160E' }
    };
    const curTheme = themeColors[submission.theme || 'pink_cream'] || themeColors.pink_cream;

    const c = ctx;

    // Helper functions for drawing doodles
    function drawWashiTape(x: number, y: number, w: number, h: number, deg = 1) {
      c.save();
      c.translate(x, y);
      c.rotate((deg * Math.PI) / 180);
      c.fillStyle = 'rgba(255, 235, 180, 0.85)';
      c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = 'rgba(45, 22, 14, 0.25)';
      c.lineWidth = 2.5;
      c.setLineDash([5, 4]);
      c.beginPath();
      c.moveTo(-w / 2, -h / 2); c.lineTo(-w / 2, h / 2);
      c.moveTo(w / 2, -h / 2); c.lineTo(w / 2, h / 2);
      c.stroke();
      c.restore();
    }

    function drawSparkles(x: number, y: number) {
      c.save();
      c.translate(x, y);
      c.fillStyle = '#FFAEC8';
      c.strokeStyle = '#2D160E';
      c.lineWidth = 3;
      // 4-pointed star
      c.beginPath();
      c.moveTo(0, -26);
      c.quadraticCurveTo(0, 0, 26, 0);
      c.quadraticCurveTo(0, 0, 0, 26);
      c.quadraticCurveTo(0, 0, -26, 0);
      c.quadraticCurveTo(0, 0, 0, -26);
      c.closePath();
      c.fill();
      c.stroke();
      // Accent sparkle
      c.fillStyle = '#FAF8F5';
      c.beginPath();
      c.moveTo(24, 12);
      c.quadraticCurveTo(24, 18, 30, 18);
      c.quadraticCurveTo(24, 18, 24, 24);
      c.quadraticCurveTo(24, 18, 18, 18);
      c.quadraticCurveTo(24, 18, 24, 12);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }

    function drawPencil(x: number, y: number) {
      c.save();
      c.translate(x, y);
      c.rotate((35 * Math.PI) / 180);
      c.fillStyle = '#FFAEC8';
      c.strokeStyle = '#2D160E';
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(-10, -35, 20, 50, 3);
      c.fill();
      c.stroke();
      // Tip
      c.fillStyle = '#FAF8F5';
      c.beginPath();
      c.moveTo(-10, 15);
      c.lineTo(0, 32);
      c.lineTo(10, 15);
      c.closePath();
      c.fill();
      c.stroke();
      // Graphite
      c.fillStyle = '#2D160E';
      c.beginPath();
      c.moveTo(-4, 25);
      c.lineTo(0, 32);
      c.lineTo(4, 25);
      c.closePath();
      c.fill();
      c.restore();
    }

    if (isMenfess) {
      // ==========================================
      // MENFESS: 4:5 RATIO (1080 x 1350)
      // ==========================================
      const cardX = 100;
      const cardY = 160;
      const cardW = 880;
      const cardH = 1050;
      const r = 40;

      // Drop shadow (4px offset equivalent in high-res)
      ctx.fillStyle = '#2D160E';
      ctx.beginPath();
      ctx.roundRect(cardX + 14, cardY + 14, cardW, cardH, r);
      ctx.fill();

      // Card Body
      ctx.fillStyle = curTheme.cardBg;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, r);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Washi Tape at card top
      drawWashiTape(cardX + cardW / 2, cardY, 180, 42, 1);

      // Sparkles top right
      drawSparkles(cardX + cardW - 65, cardY + 55);

      // Pencil doodle bottom left
      drawPencil(cardX + 30, cardY + cardH - 10);

      // Top branding
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Se.Cretfess • HIMASE', cardX + 50, cardY + 70);

      // Ticket pill top right
      ctx.fillStyle = '#FAF8F5';
      ctx.beginPath();
      ctx.roundRect(cardX + cardW - 240, cardY + 45, 180, 40, 20);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`#${submission.trackingCode}`, cardX + cardW - 150, cardY + 72);

      // Recipient Pill
      ctx.fillStyle = curTheme.accentBg;
      ctx.beginPath();
      ctx.roundRect(cardX + 50, cardY + 120, 480, 60, 30);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Untuk: ${submission.recipient.slice(0, 24)}`, cardX + 75, cardY + 160);

      // Message text
      ctx.font = 'bold 40px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#2D160E';
      const words = submission.message.split(' ');
      let line = '';
      let textY = cardY + 280;
      const maxWidth = cardW - 120;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, cardX + 60, textY);
          line = words[n] + ' ';
          textY += 62;
          if (textY > cardY + cardH - 180) {
            ctx.fillText('...', cardX + 60, textY);
            break;
          }
        } else {
          line = testLine;
        }
      }
      if (textY <= cardY + cardH - 180) {
        ctx.fillText(line, cardX + 60, textY);
      }

      // Sender Info
      ctx.fillStyle = '#6B5248';
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('DARI:', cardX + 60, cardY + cardH - 90);

      ctx.fillStyle = '#2D160E';
      ctx.font = 'italic 700 32px "Plus Jakarta Sans", sans-serif';
      const sender = submission.isAnonymous ? 'Anonim' : (submission.senderAlias || 'Anonim');
      ctx.fillText(sender, cardX + 60, cardY + cardH - 50);

      // Watermark right
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('❤️ @se.cretfess', cardX + cardW - 60, cardY + cardH - 55);

    } else {
      // ==========================================
      // SONGFESS: 9:16 RATIO (1080 x 1920)
      // Generous top safe space for Story header
      // ==========================================
      const cardX = 90;
      const cardY = 320;
      const cardW = 900;
      const cardH = 1420;
      const r = 44;

      // Drop shadow
      ctx.fillStyle = '#2D160E';
      ctx.beginPath();
      ctx.roundRect(cardX + 16, cardY + 16, cardW, cardH, r);
      ctx.fill();

      // Card Body
      ctx.fillStyle = curTheme.cardBg;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, r);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Washi Tape at card top
      drawWashiTape(cardX + cardW / 2, cardY, 220, 50, 1);

      // Sparkles top right
      drawSparkles(cardX + cardW - 75, cardY + 65);

      // Pencil doodle bottom left
      drawPencil(cardX + 35, cardY + cardH - 15);

      // Top branding
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Se.Cretfess • HIMASE', cardX + 60, cardY + 75);

      // Ticket pill top right
      ctx.fillStyle = '#FAF8F5';
      ctx.beginPath();
      ctx.roundRect(cardX + cardW - 250, cardY + 50, 190, 42, 21);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`#${submission.trackingCode}`, cardX + cardW - 155, cardY + 78);

      // Recipient Pill
      ctx.fillStyle = curTheme.accentBg;
      ctx.beginPath();
      ctx.roundRect(cardX + 60, cardY + 125, 520, 64, 32);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Didedikasikan untuk: ${submission.recipient.slice(0, 20)}`, cardX + 85, cardY + 166);

      // Outer Frame Box (holds the 1:1 box, tall and spacious)
      const centerX = cardX + cardW / 2;
      const outerW = 750;
      const outerH = 750;
      const outerX = centerX - outerW / 2;
      const outerY = cardY + 280;

      // Outer Box Shadow & Body
      ctx.fillStyle = '#2D160E';
      ctx.beginPath();
      ctx.roundRect(outerX + 10, outerY + 10, outerW, outerH, 36);
      ctx.fill();

      ctx.fillStyle = '#FAF8F5';
      ctx.beginPath();
      ctx.roundRect(outerX, outerY, outerW, outerH, 36);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Compact 1:1 Square Box inside (shifted up)
      const boxSize = 360;
      const boxX = centerX - boxSize / 2;
      const boxY = outerY + 50;

      ctx.fillStyle = '#2D160E';
      ctx.beginPath();
      ctx.roundRect(boxX + 7, boxY + 7, boxSize, boxSize, 26);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxSize, boxSize, 26);
      ctx.fill();
      ctx.strokeStyle = '#2D160E';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Song Title
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      const songTitle = submission.songData?.title || 'Judul Lagu Pilihan';
      ctx.fillText(songTitle.length > 22 ? songTitle.slice(0, 22) + '...' : songTitle, centerX, boxY + 130);

      // Artist
      ctx.fillStyle = '#6B5248';
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      const songArtist = submission.songData?.artist || 'Nama Artis / Band';
      ctx.fillText(songArtist.length > 26 ? songArtist.slice(0, 26) + '...' : songArtist, centerX, boxY + 180);

      // Timestamp Pill inside 1:1 box
      const timeLabel = submission.songData?.formattedTimeRange || submission.songData?.favoriteTimestamp || '00:00 - 00:15';
      const timeBoxW = 270;
      ctx.fillStyle = '#FAF8F5';
      ctx.beginPath();
      ctx.roundRect(centerX - timeBoxW / 2, boxY + 240, timeBoxW, 46, 23);
      ctx.fill();
      ctx.strokeStyle = 'rgba(45, 22, 14, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`⏱️ ${timeLabel} (${submission.songData?.duration || 15}s)`, centerX, boxY + 270);

      // Sender Info
      ctx.fillStyle = '#6B5248';
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DARI:', cardX + 60, cardY + cardH - 100);

      ctx.fillStyle = '#2D160E';
      ctx.font = 'italic 700 32px "Plus Jakarta Sans", sans-serif';
      const sender = submission.isAnonymous ? 'Anonim' : (submission.senderAlias || 'Anonim');
      ctx.fillText(sender, cardX + 60, cardY + cardH - 60);

      // Watermark right
      ctx.fillStyle = '#2D160E';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('❤️ @se.cretfess', cardX + cardW - 60, cardY + cardH - 65);
    }

    return canvas.toDataURL('image/png');
  }
};
