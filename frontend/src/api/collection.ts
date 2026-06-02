import { apiClient } from './client';

export type WordRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface CollectionItem {
  id: string;
  wordId: string;
  text: string;
  normalizedText: string;
  rarity: WordRarity;
  rarityScore: number;
  value: number;
  quantity: number;
  totalValue: number;
  category?: string;
  firstWonAt: string;
  lastWonAt: string;
}

export interface CollectionResponse {
  totalValue: number;
  uniqueCount: number;
  totalCount: number;
  items: CollectionItem[];
}

export async function getMyCollection() {
  const { data } = await apiClient.get<CollectionResponse>('/collection/me');
  return data;
}
