import { Injectable } from '@nestjs/common';
import { LocalWord, WordService } from './word.service';
import { SimilarityBucket } from './types/suggestion.types';

@Injectable()
export class SimilarityService {
  constructor(private readonly wordService: WordService) {}

  calculateKnownSimilarity(secretWordId: string, candidateWordId: string): number {
    const secretWord = this.wordService.getWord(secretWordId);
    const candidateWord = this.wordService.getWord(candidateWordId);

    if (!secretWord || !candidateWord) {
      return 0;
    }

    if (secretWord.normalizedText === candidateWord.normalizedText) {
      return 100;
    }

    return this.cosineToPercentage(this.cosineSimilarity(secretWord.embedding, candidateWord.embedding));
  }

  getBucket(score: number): SimilarityBucket {
    if (score >= 70) {
      return 'hot';
    }

    if (score >= 40) {
      return 'warm';
    }

    if (score >= 15) {
      return 'cold';
    }

    return 'frozen';
  }

  rankKnownWordsBySimilarity(secretWordId: string, excludedWordIds: Set<string>): Array<LocalWord & { score: number; bucket: SimilarityBucket }> {
    return this.wordService
      .getAllWords()
      .filter((word) => word.id !== secretWordId && !excludedWordIds.has(word.id))
      .map((word) => {
        const score = this.calculateKnownSimilarity(secretWordId, word.id);
        return {
          ...word,
          score,
          bucket: this.getBucket(score),
        };
      });
  }

  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    const dotProduct = vectorA.reduce((sum, value, index) => sum + value * vectorB[index], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, value) => sum + value ** 2, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, value) => sum + value ** 2, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  private cosineToPercentage(cosineSimilarity: number): number {
    const boundedSimilarity = Math.min(1, Math.max(0, cosineSimilarity));
    return Math.min(99, Math.round(boundedSimilarity ** 0.85 * 99));
  }
}
