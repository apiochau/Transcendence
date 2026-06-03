import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  forUser(userId: string) {
    return this.prisma.userStats.findUnique({ where: { userId } });
  }

  leaderboard() {
    return this.prisma.userStats.findMany({
      orderBy: [{ rating: 'desc' }, { wins: 'desc' }],
      take: 50,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
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
