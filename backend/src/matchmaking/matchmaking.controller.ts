import { Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { MatchmakingService } from './matchmaking.service';

@UseGuards(JwtAuthGuard)
@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Get('queue')
  queue() {
    return this.matchmakingService.snapshot();
  }

  @Post('queue')
  join(@CurrentUser() user: AuthenticatedUser) {
    return this.matchmakingService.join(user.userId);
  }

  @Delete('queue')
  leave(@CurrentUser() user: AuthenticatedUser) {
    return this.matchmakingService.leave(user.userId);
  }
}
