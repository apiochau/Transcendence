import { apiClient } from './client';

export type SimilarityBucket = 'hot' | 'warm' | 'cold' | 'frozen';

export interface SoloStartResponse {
  sessionId: string;
  status: string;
  secretWord: string;
}

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

export interface FinalAnswerResponse {
  success: boolean;
}

export async function startSoloGame() {
  const { data } = await apiClient.post<SoloStartResponse>('/game/solo/start');
  return data;
}

export async function getSoloSuggestions(sessionId: string) {
  const { data } = await apiClient.get<SuggestedWord[]>(`/game/solo/${encodeURIComponent(sessionId)}/suggestions`);
  return data;
}

export async function clickSoloSuggestion(sessionId: string, wordId: string) {
  const { data } = await apiClient.post<RevealedSuggestion>(
    `/game/solo/${encodeURIComponent(sessionId)}/click-suggestion`,
    { wordId },
  );
  return data;
}

export async function submitFinalAnswer(sessionId: string, answer: string) {
  const { data } = await apiClient.post<FinalAnswerResponse>(
    `/game/solo/${encodeURIComponent(sessionId)}/final-answer`,
    { answer },
  );
  return data;
}

export async function getSoloHistory(sessionId: string) {
  const { data } = await apiClient.get<SuggestionHistoryItem[]>(`/game/solo/${encodeURIComponent(sessionId)}/history`);
  return data;
}
