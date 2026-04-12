import type { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  credits: number;
  totalBooksGenerated: number;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

export type JobStatus =
  | 'pending'
  | 'generating'
  | 'building'
  | 'complete'
  | 'failed';

export type JobPhase =
  | 'starting'
  | 'researching'
  | 'writing'
  | 'drafting-images'
  | 'generating-images'
  | 'building-pdf'
  | 'building-epub'
  | 'done';

export interface JobProgress {
  phase: JobPhase;
  message: string;
  percent: number;
}

export interface BookPage {
  pageNumber: number;
  text: string;
  imageFile: string;
  imagePrompt: string;
}

export interface BookManifest {
  title: string;
  subtitle?: string;
  author?: string;
  pages: BookPage[];
  cover: { prompt: string };
}

export interface Job {
  jobId: string;
  userId: string;
  status: JobStatus;
  topic: string;
  childName: string | null;
  childAge: number | null;
  childDescription: string | null;
  artStyle: string | null;
  parentFirstName: string | null;
  situationSlug: string | null;
  situationOther: string | null;
  pages: number;
  sessionId: string;
  lastEventCursor: string | null;
  progress: JobProgress;
  bookJson: BookManifest | null;
  imageUrls: { cover: string | null; pages: (string | null)[] } | null;
  pdfUrl: string | null;
  epubUrl: string | null;
  error: { code: string; message: string } | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  creditDebited: boolean;
}

export type CreditTxnType = 'purchase' | 'spend' | 'refund';

export interface CreditTxn {
  txnId: string;
  userId: string;
  type: CreditTxnType;
  amount: number;
  balanceAfter: number;
  jobId: string | null;
  dodoPaymentId: string | null;
  createdAt: Timestamp;
}
