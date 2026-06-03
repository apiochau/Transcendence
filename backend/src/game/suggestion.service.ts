import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GameStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { SimilarityService } from './similarity.service';
import { SimilarityBucket, SuggestedWord } from './types/suggestion.types';
import { LocalWord } from './word.service';

type RankedWord = LocalWord & { score: number; bucket: SimilarityBucket };

const BUCKETS: SimilarityBucket[] = ['hot', 'warm', 'cold', 'frozen'];
const BUCKET_FALLBACK_ORDER: Record<SimilarityBucket, SimilarityBucket[]> = {
  hot: ['hot', 'warm', 'cold', 'frozen'],
  warm: ['warm', 'hot', 'cold', 'frozen'],
  cold: ['cold', 'warm', 'frozen', 'hot'],
  frozen: ['frozen', 'cold', 'warm', 'hot'],
};

@Injectable()
export class SuggestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly similarityService: SimilarityService,
  ) {}

  async generateSuggestions(sessionId: string): Promise<SuggestedWord[]> {
    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.status !== GameStatus.ACTIVE) {
      throw new BadRequestException('Game session is already finished');
    }

    if (session.nextSuggestionsAt && session.nextSuggestionsAt.getTime() > Date.now()) {
      const remainingSeconds = Math.ceil((session.nextSuggestionsAt.getTime() - Date.now()) / 1000);
      throw new BadRequestException(`Next suggestions available in ${remainingSeconds}s`);
    }

    const excludedWordIds = new Set<string>([session.secretWordId, ...session.shownWordIds]);
    const rankedWords = this.shuffle(this.similarityService.rankKnownWordsBySimilarity(session.secretWordId, excludedWordIds));
    const selected = new Map<string, RankedWord>();

    for (const bucket of BUCKETS) {
      const word = this.pickFromBucket(bucket, rankedWords, selected);

      if (word) {
        selected.set(word.id, word);
      }
    }

    for (const word of rankedWords) {
      if (selected.size >= 4) {
        break;
      }

      if (!selected.has(word.id)) {
        selected.set(word.id, word);
      }
    }

    const suggestions = this.shuffle(Array.from(selected.values()).slice(0, 4));
    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        currentWordIds: suggestions.map((word) => word.id),
        shownWordIds: [...session.shownWordIds, ...suggestions.map((word) => word.id)],
        nextSuggestionsAt: null,
      },
    });

    return suggestions.map((word) => ({
      wordId: word.id,
      word: word.text,
    }));
  }

  private pickFromBucket(
    targetBucket: SimilarityBucket,
    rankedWords: RankedWord[],
    selected: Map<string, unknown>,
  ) {
    for (const bucket of BUCKET_FALLBACK_ORDER[targetBucket]) {
      const candidate = rankedWords.find((word) => word.bucket === bucket && !selected.has(word.id));

      if (candidate) {
        return candidate;
      }
    }

    return undefined;
  }

  private shuffle<T>(items: T[]): T[] {
    const shuffledItems = [...items];

    for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledItems[index], shuffledItems[randomIndex]] = [shuffledItems[randomIndex], shuffledItems[index]];
    }

    return shuffledItems;
  }
}
