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
  rarity: number;
  rarityLabel: WordRarityLabel;
  value: number;
}

export type WordRarityLabel = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

const WORD_REWARD_OVERRIDES: Record<string, { rarityLabel: WordRarityLabel; value: number }> = {
  eau: { rarityLabel: 'common', value: 50 },
  chat: { rarityLabel: 'common', value: 80 },
  chien: { rarityLabel: 'common', value: 90 },
  pomme: { rarityLabel: 'common', value: 70 },
  voiture: { rarityLabel: 'uncommon', value: 180 },
  train: { rarityLabel: 'uncommon', value: 180 },
  avion: { rarityLabel: 'uncommon', value: 220 },
  telephone: { rarityLabel: 'rare', value: 420 },
  smartphone: { rarityLabel: 'rare', value: 550 },
  ordinateur: { rarityLabel: 'rare', value: 520 },
  electricite: { rarityLabel: 'rare', value: 480 },
  universite: { rarityLabel: 'epic', value: 1100 },
  professeur: { rarityLabel: 'epic', value: 950 },
  developpement: { rarityLabel: 'epic', value: 1600 },
  algorithme: { rarityLabel: 'epic', value: 1800 },
  cryptographie: { rarityLabel: 'legendary', value: 5200 },
  metaphysique: { rarityLabel: 'legendary', value: 6200 },
};

const RARITY_ORDER: Record<WordRarityLabel, number> = {
  common: 10,
  uncommon: 30,
  rare: 55,
  epic: 80,
  legendary: 100,
};

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
        ...this.getRewardMetadata(normalizedText),
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
            rarity: word.rarity,
            value: word.value,
            rarityLabel: word.rarityLabel,
            category: word.category,
            embedding: word.embedding,
          },
          create: {
            id: word.id,
            text: word.text,
            normalizedText: word.normalizedText,
            rarity: word.rarity,
            value: word.value,
            rarityLabel: word.rarityLabel,
            category: word.category,
            embedding: word.embedding,
          },
        }),
      ),
    );

    this.logger.log(`Synced ${words.length} controlled words to database`);
  }

  private getRewardMetadata(normalizedText: string): Pick<LocalWord, 'rarity' | 'rarityLabel' | 'value'> {
    const override = WORD_REWARD_OVERRIDES[normalizedText];
    if (override) {
      return {
        rarity: RARITY_ORDER[override.rarityLabel],
        rarityLabel: override.rarityLabel,
        value: override.value,
      };
    }

    const complexity = this.calculateWordComplexity(normalizedText);
    const rarityLabel = this.getRarityLabel(complexity);
    return {
      rarity: RARITY_ORDER[rarityLabel],
      rarityLabel,
      value: this.getValueForRarity(rarityLabel, complexity),
    };
  }

  private calculateWordComplexity(word: string) {
    const lengthScore = Math.min(55, word.length * 4);
    const uncommonLetters = (word.match(/[kwxyz]/g) ?? []).length * 6;
    const consonantGroups = (word.match(/[bcdfghjklmnpqrstvwxz]{3,}/g) ?? []).length * 8;
    const abstractSuffix = /(isme|tion|ment|ique|logie|graphie|phie|aire|ence)$/.test(word) ? 18 : 0;
    return Math.min(100, lengthScore + uncommonLetters + consonantGroups + abstractSuffix);
  }

  private getRarityLabel(complexity: number): WordRarityLabel {
    if (complexity >= 86) {
      return 'legendary';
    }

    if (complexity >= 68) {
      return 'epic';
    }

    if (complexity >= 50) {
      return 'rare';
    }

    if (complexity >= 32) {
      return 'uncommon';
    }

    return 'common';
  }

  private getValueForRarity(rarityLabel: WordRarityLabel, complexity: number) {
    const ranges: Record<WordRarityLabel, [number, number]> = {
      common: [10, 120],
      uncommon: [120, 350],
      rare: [350, 900],
      epic: [900, 2500],
      legendary: [2500, 10000],
    };
    const [minimum, maximum] = ranges[rarityLabel];
    const normalizedComplexity = Math.min(1, Math.max(0, complexity / 100));
    return Math.round(minimum + (maximum - minimum) * normalizedComplexity);
  }
}
