import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { MatchmakingMode, MatchmakingService } from './matchmaking.service';

interface JoinMatchmakingBody {
  mode?: MatchmakingMode;
  stakeCollectionItemId?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Get('queue')
  queue() {
    return this.matchmakingService.snapshot();
  }

  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.matchmakingService.status(user.userId);
  }

  @Get('daily/status')
  dailyStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.matchmakingService.dailyStatus(user.userId);
  }

  @Post('queue')
  join(@CurrentUser() user: AuthenticatedUser, @Body() body: JoinMatchmakingBody) {
    return this.matchmakingService.join(user.userId, body.mode ?? 'training', body.stakeCollectionItemId);
  }

  @Post('consume')
  consume(@CurrentUser() user: AuthenticatedUser) {
    return this.matchmakingService.consumeMatch(user.userId);
  }

  @Delete('queue')
  leave(@CurrentUser() user: AuthenticatedUser) {
    return this.matchmakingService.leave(user.userId);
  }
}
