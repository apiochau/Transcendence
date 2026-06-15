import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { ChatService } from './chat.service';

class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('global')
  getGlobalHistory() {
    return this.chatService.getGlobalHistory();
  }

  @Post('global')
  postGlobal(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendMessageDto) {
    return this.chatService.postGlobal(user.userId, dto.content);
  }

  @Get('private/:userId')
  getPrivateHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') otherUserId: string,
  ) {
    return this.chatService.getPrivateHistory(user.userId, otherUserId);
  }

  @Post('private/:userId')
  postPrivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') recipientId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.postPrivate(user.userId, recipientId, dto.content);
  }

  @Delete(':id')
  deleteMessage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.chatService.deleteMessage(user.userId, id);
  }
}