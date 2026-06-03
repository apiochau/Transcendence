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

  @Get('games-over-time')
  gamesOverTime(@Query('days') days?: string) {
  return this.analyticsService.gamesOverTime(
    Number(days) || 7, //若前端沒傳就預設7天
  );
}
}