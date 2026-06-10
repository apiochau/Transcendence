import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TwoFactorService } from './two-factor.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly twoFactorService: TwoFactorService,)
  {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setup(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactorService.generateSecret(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  enable(@CurrentUser() user: AuthenticatedUser, @Body() body: { code: string}) {
    return this.twoFactorService.enableTwoFactor(user.userId, body.code);
  }

  @Post('2fa/verify')
  verify(@Body() body: { tempToken: string; code: string}) {
    return this.authService.verifyTwoFactor(body.tempToken, body.code);
  }


  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disable(@CurrentUser() user: AuthenticatedUser, @Body() body: { code: string}) {
    return this.twoFactorService.disableTwoFactor(user.userId, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const dbUser = await this.usersService.findById(user.userId);
    return {
      id: dbUser!.id,
      email: dbUser!.email,
      username: dbUser!.username,
      displayName: dbUser!.displayName,
      avatarUrl: dbUser!.avatarUrl,
      twoFactorEnabled: dbUser!.twoFactorEnabled,
    };
  }
}
