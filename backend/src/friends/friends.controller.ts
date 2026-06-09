import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { FriendsService } from './friends.service';

class FriendRequestDto {
  @IsString()
  username: string;
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
  requestUsername(@CurrentUser() user: AuthenticatedUser, @Body() dto: FriendRequestDto) {
    return this.friendsService.requestUsername(user.userId, dto.username);
  }


  @Patch(':id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.friendsService.accept(user.userId, id);
  }
  
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.friendsService.remove(user.userId, id);
  }
}