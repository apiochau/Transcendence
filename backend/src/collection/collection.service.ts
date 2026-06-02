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

  async createStakeLock(userId: string, collectionItemId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const item = await transaction.wordCollectionItem.findFirst({
        where: {
          id: collectionItemId,
          userId,
          quantity: { gt: 0 },
        },
        include: { word: true },
      });

      if (!item) {
        throw new Error('Collection word is not available to stake');
      }

      if (item.quantity === 1) {
        await transaction.wordCollectionItem.delete({ where: { id: item.id } });
      } else {
        await transaction.wordCollectionItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: 1 } },
        });
      }

      return transaction.wordStakeLock.create({
        data: {
          userId,
          wordId: item.wordId,
          rarity: item.word.rarityLabel,
        },
        include: { word: true },
      });
    });
  }

  async assignStakeToRoom(stakeLockId: string, roomId: string) {
    return this.prisma.wordStakeLock.update({
      where: { id: stakeLockId },
      data: {
        roomId,
        status: 'MATCHED',
      },
      include: { word: true },
    });
  }

  async refundStake(stakeLockId: string) {
    const stakeLock = await this.prisma.wordStakeLock.findUnique({ where: { id: stakeLockId } });
    if (!stakeLock || stakeLock.status === 'REFUNDED' || stakeLock.status === 'WON' || stakeLock.status === 'LOST') {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.wordCollectionItem.upsert({
        where: {
          userId_wordId: {
            userId: stakeLock.userId,
            wordId: stakeLock.wordId,
          },
        },
        update: {
          quantity: { increment: 1 },
          lastWonAt: new Date(),
        },
        create: {
          userId: stakeLock.userId,
          wordId: stakeLock.wordId,
        },
      }),
      this.prisma.wordStakeLock.update({
        where: { id: stakeLock.id },
        data: {
          status: 'REFUNDED',
          settledAt: new Date(),
        },
      }),
    ]);
  }

  async settleDuelStakes(winnerUserId: string, stakeLockIds: string[]) {
    const stakeLocks = await this.prisma.wordStakeLock.findMany({
      where: {
        id: { in: stakeLockIds },
        status: { in: ['MATCHED', 'QUEUED'] },
      },
    });

    await this.prisma.$transaction(async (transaction) => {
      for (const stakeLock of stakeLocks) {
        if (stakeLock.userId === winnerUserId) {
          await transaction.wordCollectionItem.upsert({
            where: {
              userId_wordId: {
                userId: winnerUserId,
                wordId: stakeLock.wordId,
              },
            },
            update: {
              quantity: { increment: 1 },
              lastWonAt: new Date(),
            },
            create: {
              userId: winnerUserId,
              wordId: stakeLock.wordId,
            },
          });
        } else {
          await transaction.wordCollectionItem.upsert({
            where: {
              userId_wordId: {
                userId: winnerUserId,
                wordId: stakeLock.wordId,
              },
            },
            update: {
              quantity: { increment: 1 },
              lastWonAt: new Date(),
            },
            create: {
              userId: winnerUserId,
              wordId: stakeLock.wordId,
            },
          });
        }

        await transaction.wordStakeLock.update({
          where: { id: stakeLock.id },
          data: {
            status: stakeLock.userId === winnerUserId ? 'WON' : 'LOST',
            settledAt: new Date(),
          },
        });
      }
    });
  }

  async getCollection(userId: string) {
    const items = await this.prisma.wordCollectionItem.findMany({
      where: { userId, quantity: { gt: 0 } },
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
