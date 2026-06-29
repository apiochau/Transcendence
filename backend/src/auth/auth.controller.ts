import { Body, Controller, Get, Logger, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
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
  private readonly logger = new Logger(AuthController.name);
  private readonly oauthStateCookie = 'lexmon_oauth_state';

  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly usersService: UsersService,
    private readonly twoFactorService: TwoFactorService,
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
    const authorization = this.oauthService.getAuthorizationRequest(provider);
    response.cookie(this.oauthStateCookie, authorization.state, {
      httpOnly: true,
      secure: this.oauthService.usesSecureCookies(),
      sameSite: 'lax',
      maxAge: authorization.maxAgeMs,
      path: '/api/auth/oauth',
    });
    response.redirect(authorization.url);
  }

  @Get('oauth/:provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const expectedState = this.readCookie(request, this.oauthStateCookie);
    response.clearCookie(this.oauthStateCookie, {
      httpOnly: true,
      secure: this.oauthService.usesSecureCookies(),
      sameSite: 'lax',
      path: '/api/auth/oauth',
    });

    if (error) {
      response.redirect(this.oauthService.getFrontendRedirectUrl(`/oauth/callback?error=${encodeURIComponent(error)}`));
      return;
    }

    if (!code || !state) {
      response.redirect(this.oauthService.getFrontendRedirectUrl('/oauth/callback?error=missing_oauth_callback_data'));
      return;
    }

    try {
      const authResponse = await this.oauthService.completeLogin(provider, code, state, expectedState);
      const hash = new URLSearchParams({
        accessToken: authResponse.accessToken,
        user: JSON.stringify(authResponse.user),
      });

      response.redirect(`${this.oauthService.getFrontendRedirectUrl()}#${hash.toString()}`);
    } catch (error) {
      this.logger.warn(`OAuth callback failed for provider ${provider}: ${error instanceof Error ? error.message : 'unknown error'}`);
      response.redirect(this.oauthService.getFrontendRedirectUrl('/oauth/callback?error=oauth_login_failed'));
    }
  }

  private readCookie(request: Request, name: string) {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    for (const cookie of cookieHeader.split(';')) {
      const [cookieName, ...valueParts] = cookie.trim().split('=');
      if (cookieName === name) {
        return decodeURIComponent(valueParts.join('='));
      }
    }
    return undefined;
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
    const dbUser = await this.usersService.findById(user.userId) as { id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null; twoFactorEnabled?: boolean } | null;
    return {
      id: dbUser!.id,
      email: dbUser!.email,
      username: dbUser!.username,
      displayName: dbUser!.displayName,
      avatarUrl: dbUser!.avatarUrl,
      twoFactorEnabled: dbUser!.twoFactorEnabled ?? false,
    };
  }
}
