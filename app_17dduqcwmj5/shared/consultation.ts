export interface FaqMatchRequest {
  question: string;
}

export type FaqAnswerSource = 'direct' | 'generated' | 'offTopic' | 'fallback';

export interface FaqMatchResponse {
  matched: boolean;
  faqId: string | null;
  answer: string | null;
  matchedQuestion?: string | null;
  relatedFaqs?: FaqListItem[];
  fallbackMessage: string | null;
  offTopic?: boolean;
  answerSource?: FaqAnswerSource;
}

export interface FaqListItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  similarQuestion: string | null;
  status: string;
  hitCount: number;
  updateTime: string | null;
  syncStatus?: string;
}

export interface FaqListResponse {
  items: FaqListItem[];
  total: number;
}

export interface CreateFaqRequest {
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  similarQuestion?: string;
}

export interface CreateFaqResponse {
  id: string;
}

export interface UpdateFaqRequest {
  question?: string;
  answer?: string;
  category?: string;
  keywords?: string[];
  similarQuestion?: string;
  status?: string;
}

export interface UpdateFaqResponse {
  id: string;
}

export interface FaqMissListItem {
  id: string;
  question: string;
  status: string;
  createdAt: string;
  syncStatus?: string;
}

export interface FaqMissListResponse {
  items: FaqMissListItem[];
  total: number;
}

export interface ConvertFaqMissRequest {
  answer: string;
  category: string;
  keywords?: string[];
}

export interface ConvertFaqMissResponse {
  faqId: string;
}
