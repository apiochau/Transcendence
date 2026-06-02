import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  forUser(userId: string) {
    return this.prisma.userStats.findUnique({ where: { userId } });
  }

  async leaderboard() {
    const collectionItems = await this.prisma.wordCollectionItem.findMany({
      include: {
        word: { select: { value: true } },
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            stats: { select: { wins: true, gamesPlayed: true } },
          },
        },
      },
    });

    const rowsByUser = new Map<string, {
      id: string;
      collectionValue: number;
      wins: number;
      gamesPlayed: number;
      user: {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
      };
    }>();

    for (const item of collectionItems) {
      const existingRow = rowsByUser.get(item.userId);
      const value = item.word.value * item.quantity;

      if (existingRow) {
        existingRow.collectionValue += value;
        continue;
      }

      rowsByUser.set(item.userId, {
        id: item.userId,
        collectionValue: value,
        wins: item.user.stats?.wins ?? 0,
        gamesPlayed: item.user.stats?.gamesPlayed ?? 0,
        user: {
          id: item.user.id,
          username: item.user.username,
          displayName: item.user.displayName,
          avatarUrl: item.user.avatarUrl,
        },
      });
    }

    return Array.from(rowsByUser.values())
      .sort((left, right) => right.collectionValue - left.collectionValue || right.wins - left.wins)
      .slice(0, 50);
  }

  async recordOneVsOneResult(winnerId: string, loserId: string) {
    if (winnerId === loserId) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.userStats.upsert({
        where: { userId: winnerId },
        create: {
          userId: winnerId,
          gamesPlayed: 1,
          wins: 1,
        },
        update: {
          gamesPlayed: { increment: 1 },
          wins: { increment: 1 },
        },
      }),
      this.prisma.userStats.upsert({
        where: { userId: loserId },
        create: {
          userId: loserId,
          gamesPlayed: 1,
          losses: 1,
        },
        update: {
          gamesPlayed: { increment: 1 },
          losses: { increment: 1 },
        },
      }),
    ]);
  }
}
