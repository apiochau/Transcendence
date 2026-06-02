import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const RARITY_SORT_ORDER: Record<string, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async awardWord(userId: string, wordId: string) {
    return this.prisma.wordCollectionItem.upsert({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
      update: {
        quantity: { increment: 1 },
        lastWonAt: new Date(),
      },
      create: {
        userId,
        wordId,
      },
      include: {
        word: true,
      },
    });
  }

  async getCollection(userId: string) {
    const items = await this.prisma.wordCollectionItem.findMany({
      where: { userId },
      include: { word: true },
    });

    const sortedItems = items
      .map((item) => ({
        id: item.id,
        wordId: item.wordId,
        text: item.word.text,
        normalizedText: item.word.normalizedText,
        rarity: item.word.rarityLabel,
        rarityScore: item.word.rarity,
        value: item.word.value,
        quantity: item.quantity,
        totalValue: item.word.value * item.quantity,
        category: item.word.category,
        firstWonAt: item.firstWonAt,
        lastWonAt: item.lastWonAt,
      }))
      .sort((left, right) => {
        const rarityDifference = (RARITY_SORT_ORDER[right.rarity] ?? 0) - (RARITY_SORT_ORDER[left.rarity] ?? 0);
        if (rarityDifference !== 0) {
          return rarityDifference;
        }

        return right.value - left.value || left.text.localeCompare(right.text);
      });

    return {
      totalValue: sortedItems.reduce((total, item) => total + item.totalValue, 0),
      uniqueCount: sortedItems.length,
      totalCount: sortedItems.reduce((total, item) => total + item.quantity, 0),
      items: sortedItems,
    };
  }
}
