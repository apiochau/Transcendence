import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CategoryFallbackService } from './category-fallback.service';
import { EmbeddingService } from './embedding.service';
import { WordNormalizerService } from './word-normalizer.service';

const PREFERRED_SECRET_WORDS = [
  'chien',
  'chat',
  'voiture',
  'moto',
  'pomme',
  'ordinateur',
  'telephone',
  'maison',
  'ecole',
  'plage',
  'montagne',
  'train',
  'lion',
  'fruit',
  'universite',
  'professeur',
  'electricite',
  'smartphone',
  'crocodile',
];

export interface LocalWord {
  id: string;
  text: string;
  normalizedText: string;
  embedding: number[];
  category?: string;
}

@Injectable()
export class WordService implements OnModuleInit {
  private readonly logger = new Logger(WordService.name);
  private readonly wordsById = new Map<string, LocalWord>();
  private readonly wordsByNormalizedText = new Map<string, LocalWord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly wordNormalizerService: WordNormalizerService,
    private readonly embeddingService: EmbeddingService,
    private readonly categoryFallbackService: CategoryFallbackService,
  ) {
    this.buildMemoryIndex();
  }

  async onModuleInit() {
    await this.syncWordsToDatabase();
  }

  getRandomSecretWord(): LocalWord {
    const availablePreferredWords = PREFERRED_SECRET_WORDS
      .map((word) => this.getWord(word))
      .filter((word): word is LocalWord => Boolean(word));
    const words = availablePreferredWords.length > 0 ? availablePreferredWords : this.getAllWords();

    if (words.length === 0) {
      throw new Error('No local words are available to start a solo game');
    }

    return words[Math.floor(Math.random() * words.length)];
  }

  getWord(wordIdOrText: string): LocalWord | undefined {
    const normalized = this.normalize(wordIdOrText);
    return this.wordsById.get(wordIdOrText) ?? this.wordsByNormalizedText.get(normalized);
  }

  getAllWords(): LocalWord[] {
    return Array.from(this.wordsById.values());
  }

  normalize(word: string): string {
    return this.wordNormalizerService.normalize(word);
  }

  private buildMemoryIndex() {
    for (const [normalizedText, embedding] of Object.entries(this.embeddingService.getAllEmbeddings())) {
      const word: LocalWord = {
        id: normalizedText,
        text: normalizedText,
        normalizedText,
        embedding,
        category: this.categoryFallbackService.getPrimaryCategory(normalizedText),
      };

      this.wordsById.set(word.id, word);
      this.wordsByNormalizedText.set(word.normalizedText, word);
    }
  }

  private async syncWordsToDatabase() {
    const words = this.getAllWords();

    await Promise.all(
      words.map((word) =>
        this.prisma.word.upsert({
          where: { id: word.id },
          update: {
            text: word.text,
            normalizedText: word.normalizedText,
            category: word.category,
            embedding: word.embedding,
          },
          create: {
            id: word.id,
            text: word.text,
            normalizedText: word.normalizedText,
            category: word.category,
            embedding: word.embedding,
          },
        }),
      ),
    );

    this.logger.log(`Synced ${words.length} controlled words to database`);
  }
}
