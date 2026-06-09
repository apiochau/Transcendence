import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

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



  // async gamesOverTime() {
  //   const endDate = new Date();
  //   endDate.setHours(23, 59, 59, 999);

  //   const startDate = new Date();
  //   startDate.setDate(startDate.getDate() - 6);
  //   startDate.setHours(0, 0, 0, 0);

  //   return this.gamesOverTimeByRange(startDate, endDate);
  // }

  // async gamesOverTime() {
  // const endDate = new Date();
  // endDate.setHours(23, 59, 59, 999);

  // const startDate = new Date();
  // startDate.setDate(startDate.getDate() - 6);
  // startDate.setHours(0, 0, 0, 0);

  // return this.gamesOverTimeByRange(startDate, endDate);
  // }

  // async gamesOverTimeByRange(startDate: Date, endDate: Date) {
  //   // normalize boundary
  //   const start = new Date(startDate);
  //   start.setHours(0, 0, 0, 0);

  //   const end = new Date(endDate);
  //   end.setHours(23, 59, 59, 999);

  //   // calculate days safely
  //   const days =
  //     Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  //   const rawEngaged = await this.prisma.suggestionHistory.findMany({
  //     select: { sessionId: true, createdAt: true },
  //     where: {
  //       createdAt: {
  //         gte: start,
  //         lte: end,
  //       },
  //     },
  //   });

  //   const engagedMap = new Map<string, Set<string>>();

  //   for (const row of rawEngaged) {
  //     const key = toDateKey(row.createdAt);

  //     if (!engagedMap.has(key)) {
  //       engagedMap.set(key, new Set());
  //     }

  //     engagedMap.get(key)!.add(row.sessionId);
  //   }

  //   const rawCompleted = await this.prisma.gameSession.findMany({
  //     select: { id: true, finishedAt: true },
  //     where: {
  //       finishedAt: {
  //         not: null,
  //         gte: start,
  //         lte: end,
  //       },
  //     },
  //   });

  //   const completedMap = new Map<string, Set<string>>();

  //   for (const row of rawCompleted) {
  //     if (!row.finishedAt) continue;

  //     const key = toDateKey(row.finishedAt);

  //     if (!completedMap.has(key)) {
  //       completedMap.set(key, new Set());
  //     }

  //     completedMap.get(key)!.add(row.id);
  //   }

  //   const allDates: string[] = [];

  //   const cursor = new Date(start);
  //   for (let i = 0; i < days; i++) {
  //     allDates.push(toDateKey(cursor));
  //     cursor.setDate(cursor.getDate() + 1);
  //   }

  //   const engagedPerDay = allDates.map((date) => ({
  //     date,
  //     count: engagedMap.get(date)?.size ?? 0,
  //   }));

  //   const completedPerDay = allDates.map((date) => ({
  //     date,
  //     count: completedMap.get(date)?.size ?? 0,
  //   }));

  //   return {
  //     engagedPerDay,
  //     completedPerDay,
  //   };
  // }

async gamesOverTimeByRange(startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const days =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // ======================
  // 1. ENGAGED
  // ======================
  const rawEngaged = await this.prisma.suggestionHistory.findMany({
    select: { sessionId: true, createdAt: true },
    where: {
      createdAt: { gte: start, lte: end },
    },
  });

  const engagedMap = new Map<string, Set<string>>();

  for (const row of rawEngaged) {
    const key = toDateKey(row.createdAt);

    if (!engagedMap.has(key)) {
      engagedMap.set(key, new Set());
    }

    engagedMap.get(key)!.add(row.sessionId);
  }

  // ======================
  // 2. ENGAGED + COMPLETED
  // ======================
  const rawEngagedCompleted = await this.prisma.gameSession.findMany({
    select: {
      id: true,
      finishedAt: true,
      suggestionHistory: {
        select: { id: true },
      },
    },
    where: {
      finishedAt: { not: null, gte: start, lte: end },
    },
  });

  const engagedCompletedMap = new Map<string, Set<string>>();

  for (const session of rawEngagedCompleted) {
    if (!session.finishedAt) continue;
    if (session.suggestionHistory.length === 0) continue;

    const key = toDateKey(session.finishedAt);

    if (!engagedCompletedMap.has(key)) {
      engagedCompletedMap.set(key, new Set());
    }

    engagedCompletedMap.get(key)!.add(session.id);
  }

  // ======================
  // 3. DATE RANGE
  // ======================
  const allDates: string[] = [];
  const cursor = new Date(start);

  for (let i = 0; i < days; i++) {
    allDates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // ======================
  // 4. OUTPUT
  // ======================
  const engagedPerDay = allDates.map((date) => ({
    date,
    count: engagedMap.get(date)?.size ?? 0,
  }));

  const engagedCompletedPerDay = allDates.map((date) => ({
    date,
    count: engagedCompletedMap.get(date)?.size ?? 0,
  }));

  return {
    engagedPerDay,
    engagedCompletedPerDay,
  };
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

  async getCollectionRarityDistribution() 
  {
    const items =
      await this.prisma.wordCollectionItem.findMany({
        include: {
          word: {
            select: {
              rarityLabel: true,
            },
          },
        },
      });

    const buckets = new Map<string, number>();

    for (const item of items) {
      const rarity = item.word.rarityLabel;

      buckets.set(
        rarity,
        (buckets.get(rarity) ?? 0) + item.quantity
      );
    }

    return Array.from(buckets.entries()).map(
      ([rarity, count]) => ({rarity, count}));
  }


  async getWinSpeedDistribution() 
  {
    const finishedGames = await this.prisma.gameSession.findMany({
      where: { finishedAt: { not: null } },
      include: { suggestionHistory: { select: { createdAt: true } } },
    });

    const buckets: Record<string, number> = {
      '<10s': 0,
      '10–30s': 0,
      '30–60s': 0,
      '1–2min': 0,
      '2min+': 0,
    };

    for (const game of finishedGames) {
      if (!game.finishedAt || game.suggestionHistory.length === 0) continue;

      // fist suggestion
      const firstSuggestion = game.suggestionHistory.reduce(
        (min, sh) => (sh.createdAt < min ? sh.createdAt : min),
        game.finishedAt,
      );

      const durationSec =
        (game.finishedAt.getTime() - firstSuggestion.getTime()) / 1000;

      if (durationSec < 10) buckets['<10s']++;
      else if (durationSec < 30) buckets['10–30s']++;
      else if (durationSec < 60) buckets['30–60s']++;
      else if (durationSec < 120) buckets['1–2min']++;
      else buckets['2min+']++;
    }

    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }

}


