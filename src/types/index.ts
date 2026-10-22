export type SubmissionType = 'menfess' | 'songfess';

export type SubmissionStatus = 'PENDING' | 'DESIGNED' | 'READY' | 'POSTED' | 'REJECTED';

export type SubmissionCategory = 
  | 'general'
  | 'crush' 
  | 'appreciation' 
  | 'campus_life' 
  | 'critique' 
  | 'encouragement' 
  | 'friendship';

export type CardTheme = 'pink_cream' | 'matcha' | 'caramel' | 'lavender';

export interface YouTubeSearchResult {
  id: string; // videoId
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishTime?: string;
}

export interface SongData {
  title: string;
  artist: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  startTime?: number; // seconds
  endTime?: number;   // seconds
  duration?: number;  // 10, 15, or 30 seconds
  formattedTimeRange?: string; // e.g. "01:15 - 01:30"
  spotifyUrl?: string;
  favoriteTimestamp?: string;
  favoriteLyric?: string;
  albumArtUrl?: string;
}

export interface Submission {
  id: string;
  trackingCode: string;
  type: SubmissionType;
  recipient: string;
  senderAlias: string;
  isAnonymous: boolean;
  category: SubmissionCategory;
  message: string;
  theme: CardTheme;
  songData?: SongData;
  status: SubmissionStatus;
  statusNote?: string;
  instagramPostUrl?: string;
  cardImageUrl?: string;
  createdAt: string;
  reviewedAt?: string;
  deviceFingerprint?: string;
}

export interface SongfessSession {
  isOpen: boolean;
  sessionNumber: number;
  title: string;
  operatingHours: string;
  quotaTotal: number;
  quotaRemaining: number;
  announcement?: string;
}
