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
}
