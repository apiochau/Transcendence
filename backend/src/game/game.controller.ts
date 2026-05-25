import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { GameService } from './game.service';

@UseGuards(JwtAuthGuard)
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  listRecent() {
    return this.gameService.listRecent();
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser) {
    return this.gameService.createWaitingGame(user.userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.gameService.findById(id);
  }
}
