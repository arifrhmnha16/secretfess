export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const query = req.query.q || req.body?.q || '';
  if (!query || !query.trim()) {
    return res.status(200).json({ results: [] });
  }

  const q = query.trim();
  const apiKey = process.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  // 1. Coba panggil YouTube Data API v3 dengan header Referer yang terverifikasi di Google Cloud
  if (apiKey && !apiKey.includes('your_')) {
    try {
      const ytEndpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=8&q=${encodeURIComponent(q)}&key=${apiKey}`;
      
      const ytRes = await fetch(ytEndpoint, {
        headers: {
          'Referer': 'http://localhost:5173/'
        }
      });

      if (ytRes.ok) {
        const data = await ytRes.json();
        if (data.items && data.items.length > 0) {
          const results = data.items.map(item => ({
            id: item.id.videoId,
            title: decodeHtml(item.snippet.title),
            channelTitle: decodeHtml(item.snippet.channelTitle),
            thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            publishTime: item.snippet.publishedAt ? item.snippet.publishedAt.slice(0, 4) : ''
          }));

          return res.status(200).json({ results, source: 'youtube-api' });
        }
      } else {
        const errJson = await ytRes.json().catch(() => ({}));
        console.warn('[YouTube API proxy warning]:', errJson?.error?.message || ytRes.statusText);
      }
    } catch (ytErr) {
      console.warn('[YouTube API fetch error]:', ytErr.message);
    }
  }

  // 2. Fallback: Gunakan iTunes Search API jika kuota YouTube habis / dibatasi
  try {
    const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=8`);
    if (itunesRes.ok) {
      const itunesData = await itunesRes.json();
      if (itunesData.results && itunesData.results.length > 0) {
        const results = itunesData.results.map(track => ({
          id: `itunes_${track.trackId}`,
          title: `${track.artistName} - ${track.trackName}`,
          channelTitle: track.artistName,
          thumbnailUrl: track.artworkUrl100?.replace('100x100bb', '600x600bb') || track.artworkUrl100 || '',
          publishTime: track.releaseDate ? track.releaseDate.slice(0, 4) : '',
          previewUrl: track.previewUrl
        }));

        return res.status(200).json({ results, source: 'music-catalog', isFallback: true });
      }
    }
  } catch (itunesErr) {
    console.warn('[iTunes search fallback error]:', itunesErr.message);
  }

  return res.status(200).json({ results: [], error: 'Pencarian tidak menemukan lagu.' });
}

function decodeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
