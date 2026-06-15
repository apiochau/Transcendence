import {
  Body, Controller, Get, Param, Patch,
  Post, UploadedFile, UseGuards, Query, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
import { RealtimeGateway } from '../websocket/websocket.gateway';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly gateway: RealtimeGateway,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getPublicProfile(user.userId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
      },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.usersService.updateProfile(user.userId, { avatarUrl });
  }

  @Get('search')
  search(@Query('q') q: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.searchUsers(q.trim(), user.userId);
  }

  
  @Get(':id')
  async getProfile(@Param('id') id: string) {
    const profile = await this.usersService.getPublicProfile(id);
    return { ...profile, isOnline: this.gateway.isOnline(id) };
  }

  @Get(':id/games')
  async getMatchHistory(@Param('id') id: string) {
    return this.usersService.getMatchHistory(id);
  }
}
