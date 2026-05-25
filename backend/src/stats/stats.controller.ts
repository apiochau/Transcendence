import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.statsService.forUser(user.userId);
  }

  @Get('leaderboard')
  leaderboard() {
    return this.statsService.leaderboard();
  }

  @Get(':userId')
  forUser(@Param('userId') userId: string) {
    return this.statsService.forUser(userId);
  }
}
