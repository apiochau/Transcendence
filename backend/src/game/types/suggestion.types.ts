export type SimilarityBucket = 'hot' | 'warm' | 'cold' | 'frozen';

export interface SuggestedWord {
  wordId: string;
  word: string;
}

export interface RevealedSuggestion {
  word: string;
  score: number;
  bucket: SimilarityBucket;
}

export interface SuggestionHistoryItem extends RevealedSuggestion {
  wordId: string;
  createdAt: string;
}
