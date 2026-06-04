import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService 
{
  constructor(private readonly prisma: PrismaService) {}

  async overview() 
  {
    const [
      totalUsers,
      totalGamesStarted,
      totalGamesEngaged,
      totalGamesCompleted,
      totalTournaments,
      ] = await Promise.all([
        this.prisma.user.count(),

        //Sessions started (created sessions)
        this.prisma.gameSession.count(),

        //Sessions engaged (has at least one suggestion click)
        this.prisma.suggestionHistory
          .findMany({
            select: { sessionId: true },
            distinct: ['sessionId'],
          })
          .then(res => res.length),

        //Sessions completed
        this.prisma.gameSession.count({
          where: { finishedAt: { not: null },},
          }),

          this.prisma.tournament.count(),
      ]);

      return {
        totalUsers,
        totalGamesStarted,
        totalGamesEngaged,
        totalGamesCompleted,
        totalTournaments,
      };
  }


  async gamesOverTime(days: number) 
  {
    const endDate = new Date();
    const startDate = new Date();

    //startDate.setDate(endDate.getDate() - days);
    startDate.setDate(endDate.getDate() - (days - 1));

    // Engaged session per day
    const rawEngaged = await this.prisma.suggestionHistory.findMany({
      select: { sessionId: true, createdAt: true },
      where: { createdAt: { gte: startDate, lte: endDate,},},
    });

    const engagedMap = new Map<string, Set<string>>();

    for (const row of rawEngaged) {
      const date = row.createdAt.toISOString().split('T')[0];

      if (!engagedMap.has(date)) {
        engagedMap.set(date, new Set());
      }

      engagedMap.get(date)!.add(row.sessionId);
    }

    const allDates = [...Array(days)].map((_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
    });

    // 補齊每天的資料，即使沒有 session
    const engagedPerDay = allDates.map(date => ({
      date, count: engagedMap.get(date)?.size ?? 0,
    }));

    const rawCompleted = await this.prisma.gameSession.findMany({
      select: { id: true, finishedAt: true, },
      where: { finishedAt: { not: null, gte: startDate, lte: endDate, },},
      });

    const completedMap = new Map<string, Set<string>>();

    for (const row of rawCompleted) {
      const date = row.finishedAt!.toISOString().split('T')[0];

      if (!completedMap.has(date)) {
        completedMap.set(date, new Set());
      }

      completedMap.get(date)!.add(row.id);
    }

    const completedPerDay = allDates.map(date => ({
      date, count: completedMap.get(date)?.size ?? 0,
      }));

    return {engagedPerDay, completedPerDay,};
  }

  async getSimilarityDistribution() 
  {
    const result = await this.prisma.suggestionHistory.groupBy({
      by: ['bucket'],
      _count: { bucket: true,},});

    return result.map(item => ({
      bucket: item.bucket,
      count: item._count.bucket,
      }));
  }
}