import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  forUser(userId: string) {
    return this.prisma.userStats.findUnique({ where: { userId } });
  }

  async leaderboard() {
    const users = await this.prisma.user.findMany({
      include: {
        stats: { select: { wins: true, gamesPlayed: true } },
        wordCollection: {
          where: { quantity: { gt: 0 } },
          include: {
            word: { select: { value: true } },
          },
        },
      },
    });

    return users
      .map((user) => ({
        id: user.id,
        collectionValue: user.wordCollection.reduce((total, item) => total + item.word.value * item.quantity, 0),
        wins: user.stats?.wins ?? 0,
        gamesPlayed: user.stats?.gamesPlayed ?? 0,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      }))
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
