import { Controller, Get } from '@nestjs/common';
import { Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController 
{
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analyticsService.overview();
  }

  // @Get('games-over-time')
  // gamesOverTime(@Query('days') days?: string) {
  //   return this.analyticsService.gamesOverTime(
  //     Number(days) || 7, //若前端沒傳就預設7天
  //     );
  // }
  @Get('games-over-time')
  async gamesOverTime(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const today = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = today;
      start = new Date();
      start.setDate(today.getDate() - 6);
    }

    return this.analyticsService.gamesOverTimeByRange(start, end);
  }

  @Get('similarity-distribution')
  getSimilarityDistribution() {
    return this.analyticsService.getSimilarityDistribution();
  };

  @Get('collection-rarity-distribution')
  getCollectionRarityDistribution() {
    return this.analyticsService.getCollectionRarityDistribution();
  };

  @Get('win-speed-distribution')
  getWinSpeedDistribution() {
    return this.analyticsService.getWinSpeedDistribution();
  };
}