import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService 
{
  constructor(private readonly prisma: PrismaService) {}

  async overview() 
  {
    const [totalUsers, totalGames, totalTournaments] =
      await Promise.all([
        this.prisma.user.count(),
        //this.prisma.gameSession.count(),
        this.prisma.game.count({
          where: { status: 'FINISHED' },}),
        this.prisma.tournament.count(),
      ]);


    return {
      totalUsers,
      totalGames,
      totalTournaments,
    };
  }
}