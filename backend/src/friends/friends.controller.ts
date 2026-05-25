import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { FriendsService } from './friends.service';

class FriendRequestDto {
  @IsString()
  addresseeId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listForUser(user.userId);
  }

  @Post('requests')
  request(@CurrentUser() user: AuthenticatedUser, @Body() dto: FriendRequestDto) {
    return this.friendsService.request(user.userId, dto.addresseeId);
  }
}
