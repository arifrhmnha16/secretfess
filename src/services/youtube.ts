import type { YouTubeSearchResult } from '../types';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

// Clean HTML entities common in YouTube titles
function decodeHtmlEntities(str: string): string {
  const doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.documentElement.textContent || str;
}

// Fallback catalog if API key is not configured or quota limit is reached
const FALLBACK_POPULAR_SONGS: YouTubeSearchResult[] = [
  {
    id: 'G7p3_B_H6bQ',
    title: 'Bernadya - Satu Bulan (Official Music Video)',
    channelTitle: 'Bernadya',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    publishTime: '2024'
  },
  {
    id: 'M7lc1UVf-VE',
    title: 'Juicy Luicy - Sialan (Official Audio)',
    channelTitle: 'Juicy Luicy Band',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
    publishTime: '2023'
  },
  {
    id: 'e-ORhEE9VVg',
    title: 'Taylor Swift - Blank Space',
    channelTitle: 'Taylor Swift',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    publishTime: '2014'
  },
  {
    id: 'L_LUpnjgPso',
    title: 'Nadin Amizah - Rayuan Perempuan Gila',
    channelTitle: 'Nadin Amizah',
    thumbnailUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
    publishTime: '2023'
  },
  {
    id: 'kOCkne-Bku4',
    title: 'Sal Priadi - Dari planet lain (Official Video)',
    channelTitle: 'Sal Priadi',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80',
    publishTime: '2024'
  },
  {
    id: 'RgKAFK5djSk',
    title: 'Wiz Khalifa - See You Again ft. Charlie Puth',
    channelTitle: 'Wiz Khalifa',
    thumbnailUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400&q=80',
    publishTime: '2015'
  }
];

export const youtubeService = {
  hasApiKey(): boolean {
    return Boolean(YOUTUBE_API_KEY && YOUTUBE_API_KEY !== 'your_youtube_api_key_here');
  },

  async searchVideos(queryText: string): Promise<{
    results: YouTubeSearchResult[];
    isFallback?: boolean;
    error?: string;
  }> {
    const q = queryText.trim();
    if (!q) return { results: [] };

    // If no valid API key is set, use fallback search
    if (!this.hasApiKey()) {
      const lower = q.toLowerCase();
      const filtered = FALLBACK_POPULAR_SONGS.filter(
        item => item.title.toLowerCase().includes(lower) || item.channelTitle.toLowerCase().includes(lower)
      );
      return {
        results: filtered.length > 0 ? filtered : FALLBACK_POPULAR_SONGS.slice(0, 4),
        isFallback: true,
        error: 'API Key YouTube belum diisi di .env. Menggunakan data kurasi contoh.'
      };
    }

    try {
      const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=6&q=${encodeURIComponent(
        q
      )}&key=${YOUTUBE_API_KEY}`;

      const res = await fetch(endpoint);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP error ${res.status}`;
        console.warn('YouTube API call failed:', message);

        // Fallback to sample songs on quota exhaustion or error
        const lower = q.toLowerCase();
        const filtered = FALLBACK_POPULAR_SONGS.filter(
          item => item.title.toLowerCase().includes(lower) || item.channelTitle.toLowerCase().includes(lower)
        );
        return {
          results: filtered.length > 0 ? filtered : FALLBACK_POPULAR_SONGS.slice(0, 4),
          isFallback: true,
          error: `Kuota API habis atau gagal: ${message}. Menampilkan hasil contoh.`
        };
      }

      const data = await res.json();
      const items = data.items || [];

      const results: YouTubeSearchResult[] = items.map((item: any) => ({
        id: item.id?.videoId || '',
        title: decodeHtmlEntities(item.snippet?.title || 'Judul Tidak Tersedia'),
        channelTitle: decodeHtmlEntities(item.snippet?.channelTitle || 'Artis'),
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        publishTime: item.snippet?.publishedAt
      })).filter((v: YouTubeSearchResult) => Boolean(v.id));

      return { results };
    } catch (err: any) {
      console.error('Error fetching YouTube API:', err);
      return {
        results: FALLBACK_POPULAR_SONGS.slice(0, 4),
        isFallback: true,
        error: 'Gagal menghubungi server YouTube. Menampilkan hasil contoh.'
      };
    }
  },

  formatSecondsToTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const mm = mins < 10 ? `0${mins}` : `${mins}`;
    const ss = secs < 10 ? `0${secs}` : `${secs}`;
    return `${mm}:${ss}`;
  }
};
