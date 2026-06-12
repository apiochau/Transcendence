import { Body, Controller, Get, Post, Query, Res, UseGuards, Param } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OAuthService } from './oauth.service';
import { RegisterDto } from './dto/register.dto';
import { TwoFactorService } from './two-factor.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
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

  @Get('oauth/providers')
  oauthProviders() {
    return this.oauthService.listProviders();
  }

  @Get('oauth/:provider')
  startOAuth(@Param('provider') provider: string, @Res() response: Response) {
    response.redirect(this.oauthService.getAuthorizationUrl(provider));
  }

  @Get('oauth/:provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    if (error) {
      response.redirect(this.oauthService.getFrontendRedirectUrl(`/oauth/callback?error=${encodeURIComponent(error)}`));
      return;
    }

    if (!code || !state) {
      response.redirect(this.oauthService.getFrontendRedirectUrl('/oauth/callback?error=missing_oauth_callback_data'));
      return;
    }

    const authResponse = await this.oauthService.completeLogin(provider, code, state);
    const hash = new URLSearchParams({
      accessToken: authResponse.accessToken,
      user: JSON.stringify(authResponse.user),
    });

    response.redirect(`${this.oauthService.getFrontendRedirectUrl()}#${hash.toString()}`);
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
