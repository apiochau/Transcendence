import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { ClickSuggestionDto } from './dto/click-suggestion.dto';
import { FinalAnswerDto } from './dto/final-answer.dto';
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

@Controller('game')
export class SoloGameController {
  constructor(private readonly gameService: GameService) {}

  @Post('solo/start')
  startSolo() {
    return this.gameService.startSoloSession();
  }

  @Get('solo/:sessionId/suggestions')
  suggestions(@Param('sessionId') sessionId: string) {
    return this.gameService.getSoloSuggestions(sessionId);
  }

  @Post('solo/:sessionId/click-suggestion')
  clickSuggestion(@Param('sessionId') sessionId: string, @Body() clickSuggestionDto: ClickSuggestionDto) {
    return this.gameService.clickSuggestion(sessionId, clickSuggestionDto.wordId);
  }

  @Post('solo/:sessionId/final-answer')
  finalAnswer(@Param('sessionId') sessionId: string, @Body() finalAnswerDto: FinalAnswerDto) {
    return this.gameService.submitFinalAnswer(sessionId, finalAnswerDto.answer);
  }

  @Post('solo/:sessionId/give-up')
  giveUp(@Param('sessionId') sessionId: string) {
    return this.gameService.giveUpSoloSession(sessionId);
  }

  @Get('solo/:sessionId/history')
  history(@Param('sessionId') sessionId: string) {
    return this.gameService.getSoloHistory(sessionId);
  }
}
