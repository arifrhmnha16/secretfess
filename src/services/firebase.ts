import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  type Firestore 
} from 'firebase/firestore';
import type { Submission } from '../types';

export interface LiveSessionStatus {
  isOpen: boolean;
  sessionNumber: number;
  title: string;
  operatingHours: string;
  quotaTotal: number;
  quotaUsed: number;
  quotaRemaining: number;
  announcement?: string;
}

const MOCK_STORAGE_KEY = 'himasefess_submissions_cache';
const SESSION_STORAGE_KEY = 'himasefess_session_config';

function getStoredSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredSubmissions(subs: Submission[]) {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(subs));
  } catch (e) {
    console.warn('Failed to save to local cache:', e);
  }
}

// Check Firebase configuration from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  !firebaseConfig.apiKey.includes('your_')
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
  } catch (err) {
    console.warn('Failed to initialize Firebase SDK, using local cache:', err);
  }
}

/**
 * Service to store and retrieve submissions with real Firestore & local cache.
 */
export const submissionService = {
  isLiveFirebase(): boolean {
    return Boolean(db);
  },

  getFirebaseProjectId(): string {
    return firebaseConfig.projectId || 'Local Mode';
  },

  async createSubmission(data: Omit<Submission, 'id' | 'createdAt' | 'status'>): Promise<Submission> {
    const newSubmission: Submission = {
      ...data,
      id: 'sub_' + Math.random().toString(36).substring(2, 9),
      status: 'PENDING',
      statusNote: 'Menunggu review dari tim kurasi pengurus HIMASE.',
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'submissions'), newSubmission);
        newSubmission.id = docRef.id;
      } catch (err) {
        console.error('Firestore addDoc error, saving to local cache:', err);
      }
    }

    const current = getStoredSubmissions();
    current.unshift(newSubmission);
    saveStoredSubmissions(current);

    return newSubmission;
  },

  async getSubmissionByCode(trackingCode: string): Promise<Submission | null> {
    const cleanCode = trackingCode.trim().toUpperCase().replace(/^#/, '');

    if (db) {
      try {
        const q = query(
          collection(db, 'submissions'), 
          where('trackingCode', '==', cleanCode)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          return { ...(docSnap.data() as Submission), id: docSnap.id };
        }
      } catch (err) {
        console.warn('Firestore query error:', err);
      }
    }

    const localList = getStoredSubmissions();
    const foundLocal = localList.find(s => s.trackingCode.toUpperCase().replace(/^#/, '') === cleanCode);
    return foundLocal || null;
  },

  async getAllSubmissions(): Promise<Submission[]> {
    if (db) {
      try {
        let q;
        try {
          q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
        } catch {
          q = query(collection(db, 'submissions'));
        }
        const querySnapshot = await getDocs(q);
        const list: Submission[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as Submission), id: docSnap.id });
        });
        
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        saveStoredSubmissions(list);
        return list;
      } catch (err) {
        console.warn('Firestore getAllSubmissions error:', err);
      }
    }

    return getStoredSubmissions();
  },

  async updateSubmissionStatus(
    id: string, 
    status: Submission['status'], 
    statusNote?: string, 
    instagramPostUrl?: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const updateData: Partial<Submission> = {
      status,
      reviewedAt: now
    };
    if (statusNote !== undefined) updateData.statusNote = statusNote;
    if (instagramPostUrl !== undefined) updateData.instagramPostUrl = instagramPostUrl;

    if (db) {
      try {
        const docRef = doc(db, 'submissions', id);
        await updateDoc(docRef, updateData);
      } catch (err) {
        console.warn('Firestore updateDoc error:', err);
      }
    }

    const current = getStoredSubmissions();
    const idx = current.findIndex(s => s.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updateData };
      saveStoredSubmissions(current);
    }

    return true;
  },

  async deleteSubmission(id: string): Promise<boolean> {
    if (db) {
      try {
        const docRef = doc(db, 'submissions', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Firestore deleteDoc error:', err);
      }
    }

    const current = getStoredSubmissions();
    const filtered = current.filter(s => s.id !== id);
    saveStoredSubmissions(filtered);
    return true;
  },

  async getRecentHighlights(): Promise<Submission[]> {
    if (db) {
      try {
        const q = query(
          collection(db, 'submissions'),
          where('status', 'in', ['POSTED', 'READY']),
          limit(6)
        );
        const querySnapshot = await getDocs(q);
        const items: Submission[] = [];
        querySnapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as Submission), id: docSnap.id });
        });
        if (items.length > 0) return items;
      } catch (err) {
        console.warn('Firestore highlights error:', err);
      }
    }

    const list = getStoredSubmissions();
    return list.filter(s => s.status === 'POSTED' || s.status === 'READY').slice(0, 6);
  },

  clearLocalCache(): void {
    try {
      localStorage.removeItem(MOCK_STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  async getSessionStatus(): Promise<LiveSessionStatus> {
    const defaultConfig: LiveSessionStatus = {
      isOpen: true,
      sessionNumber: 1,
      title: 'Sesi Malam Ini',
      operatingHours: '18:00 – 23:00 WIB',
      quotaTotal: 50,
      quotaUsed: 0,
      quotaRemaining: 50,
      announcement: 'Pengurus HIMASE mengkurasi maksimal 50 kiriman terbaik untuk di-generate menjadi kartu Instagram eksklusif.'
    };

    let base = { ...defaultConfig };
    try {
      const localRaw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (localRaw) {
        base = { ...base, ...JSON.parse(localRaw) };
      }
    } catch {
      // ignore
    }

    if (base.sessionNumber === 12) {
      base.sessionNumber = 1;
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...base, sessionNumber: 1 }));
      } catch {
        // ignore
      }
    }

    let actualUsed = 0;
    if (db) {
      try {
        const sessionRef = doc(db, 'config', 'session');
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
          const remoteData = sessionSnap.data();
          if (remoteData.sessionNumber === 12) {
            remoteData.sessionNumber = 1;
            setDoc(sessionRef, { sessionNumber: 1 }, { merge: true }).catch(() => {});
          }
          base = { ...base, ...remoteData };
        } else {
          setDoc(sessionRef, { sessionNumber: 1 }, { merge: true }).catch(() => {});
        }

        // Count live submissions in Firestore
        const subsSnap = await getDocs(collection(db, 'submissions'));
        actualUsed = subsSnap.size;
      } catch (err) {
        console.warn('Firestore session status error:', err);
        actualUsed = getStoredSubmissions().length;
      }
    } else {
      actualUsed = getStoredSubmissions().length;
    }

    const quotaTotal = Number(base.quotaTotal) || 50;
    const quotaUsed = actualUsed;
    const quotaRemaining = Math.max(0, quotaTotal - quotaUsed);

    return {
      ...base,
      quotaTotal,
      quotaUsed,
      quotaRemaining
    };
  },

  async updateSessionConfig(config: Partial<LiveSessionStatus>): Promise<boolean> {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }

    if (db) {
      try {
        const sessionRef = doc(db, 'config', 'session');
        await setDoc(sessionRef, config, { merge: true });
        return true;
      } catch (err) {
        console.warn('Firestore updateSessionConfig error:', err);
      }
    }
    return true;
  },

  generateTrackingCode(): string {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `SF-2026-${randomDigits}`;
  }
};
