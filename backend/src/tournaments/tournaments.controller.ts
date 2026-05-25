import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { TournamentsService } from './tournaments.service';

class CreateTournamentDto {
  @IsString()
  @MinLength(3)
  name: string;
}

@UseGuards(JwtAuthGuard)
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  list() {
    return this.tournamentsService.list();
  }

  @Post()
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto.name);
  }

  @Post(':id/entries')
  join(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tournamentsService.join(id, user.userId);
  }
}
