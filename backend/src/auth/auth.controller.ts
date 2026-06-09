import { Body, Controller, Get, Post, Query, Res, UseGuards, Param } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OAuthService } from './oauth.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

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
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
